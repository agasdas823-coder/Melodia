import { API_URL } from './config';
import { cacheManager } from './CacheManager';
import { StreamCache } from './StreamCache';

const CACHE_PREFIX = 'melodia_track_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (YouTube/yt-dlp URLs cached longer)

export class MusicSourceManager {
  /**
   * Main entry point for resolving a track.
   * Flow: IndexedDB -> localStorage -> YouTube Direct
   */
  async resolve(track) {
    if (!track) throw new Error('No track provided');

    const title  = track.title  || track.name || '';
    const artist = track.artist || track.artists?.[0]?.name || '';
    const proxyUrl = `${API_URL}/api/music/stream/${track.id}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;

    return {
      id: track.id,
      url: proxyUrl,
      title: title,
      artist: artist,
      thumbnail: track.thumbnail || track.thumbnail_medium || track.coverArtUrl || null,
      source: 'youtube',
    };
  }

  /**
   * Prefetch a track in the background to warm up the backend cache.
   */
  async prefetch(track) {
    if (!track || !track.id) return;

    try {
      const title  = track.title  || track.name || '';
      const artist = track.artist || track.artists?.[0]?.name || '';
      const warmUrl = `${API_URL}/api/music/stream/${track.id}?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
      
      // Perform a low-overhead Range fetch to trigger backend yt-dlp resolution and cache warming
      fetch(warmUrl, { headers: { 'Range': 'bytes=0-0' } }).catch(() => {});
    } catch (e) {}
  }

  /**
   * Prefetch multiple tracks in parallel, with a concurrency limit.
   */
  async prefetchBatch(tracks) {
    if (!tracks || !Array.isArray(tracks)) return;
    const BATCH_SIZE = 3;
    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(track => this.prefetch(track)));
    }
  }

  // ── YouTube ─────────────────────────────────────────────────────────────────

  async fetchYouTube(track) {
    const title  = track.title  || track.name || '';
    const artist = track.artist || track.artists?.[0]?.name || '';

    // Try at most 2 variants — the backend handles fallback via Cobalt proxy
    const attempts = [
      { title, artist },
      { title: title.replace(/\([^)]*\)/g, '').trim(), artist },
    ];

    // Deduplicate
    const seen = new Set();
    const unique = attempts.filter(att => {
      const key = `${att.title.toLowerCase()}|${att.artist.toLowerCase()}`;
      if (seen.has(key) || !att.title) return false;
      seen.add(key);
      return true;
    });

    let lastError = null;
    for (let i = 0; i < unique.length; i++) {
      const { title: t, artist: a } = unique[i];
      try {
        console.log(`[MusicSourceManager] YouTube attempt ${i + 1}: "${t}" by "${a}"`);
        const streamUrl = `${API_URL}/api/music/stream/${track.id}?title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`;
        const res = await fetch(streamUrl);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();

        if (data.url) {
          return {
            id: track.id,
            url: data.url,
            title: t || title,
            artist: a || artist,
            thumbnail: track.thumbnail || track.thumbnail_medium || track.coverArtUrl || null,
            source: 'youtube',
          };
        }
      } catch (err) {
        console.warn(`[MusicSourceManager] Attempt ${i + 1} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('Unable to play this song');
  }

  // ── Cache helpers ───────────────────────────────────────────────────────────

  getLocalCached(track) {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${track.id}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
        localStorage.removeItem(`${CACHE_PREFIX}${track.id}`);
        return null;
      }

      return {
        id: track.id,
        url: parsed.url,
        title: parsed.title || track.title || track.name || '',
        artist: parsed.artist || track.artist || track.artists?.[0]?.name || '',
        thumbnail: parsed.thumbnail || track.thumbnail || track.thumbnail_medium || track.coverArtUrl || null,
        source: 'youtube',
      };
    } catch {
      return null;
    }
  }

  saveToAllCaches(track, result) {
    if (track.id && result.url) {
      StreamCache.set(track.id, result.url);
    }

    cacheManager.saveAudio({
      ...result,
      id: track.id,
      timestamp: Date.now(),
    }).catch(e => console.warn('Failed to save to IndexedDB', e));

    try {
      localStorage.setItem(`${CACHE_PREFIX}${track.id}`, JSON.stringify({
        url: result.url,
        title: result.title,
        artist: result.artist,
        thumbnail: result.thumbnail,
        source: 'youtube',
        timestamp: Date.now(),
      }));
    } catch {
      // localStorage might be full
    }
  }

  async clearCache() {
    try {
      StreamCache.clear();
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      await cacheManager.clearCache();
    } catch {}
  }

  async deleteFromCache(trackId) {
    if (!trackId) return;
    try {
      localStorage.removeItem(`melodia_stream_cache_${trackId}`);
      localStorage.removeItem(`${CACHE_PREFIX}${trackId}`);
      await cacheManager.removeAudio(trackId);
      console.log(`[MusicSourceManager] Evicted track from cache: ${trackId}`);
    } catch (e) {
      console.warn(`[MusicSourceManager] Failed to evict track from cache: ${trackId}`, e);
    }
  }
}

// Export singleton
export const musicSourceManager = new MusicSourceManager();
export const deleteTrackCache = (trackId) => musicSourceManager.deleteFromCache(trackId);

// Backward compatibility
export const resolveTrack = (track) => musicSourceManager.resolve(track);
export const clearMusicAPICache = () => musicSourceManager.clearCache();
export const clearAllMusicAPICache = () => musicSourceManager.clearCache();
export const getSourceStatus = () => ({});
