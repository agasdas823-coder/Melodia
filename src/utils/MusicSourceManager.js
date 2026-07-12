import { API_URL } from './config';
import { cacheManager } from './CacheManager';
import { StreamCache } from './StreamCache';

const CACHE_PREFIX = 'melodia_track_cache_';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (YouTube URLs expire)

export class MusicSourceManager {
  constructor() {
    this.maxRetries = 3;
    this.retryCount = 0;
  }

  /**
   * Main entry point for resolving a track.
   * Flow: IndexedDB -> localStorage -> YouTube Direct (/api/stream/:id)
   */
  async resolve(track) {
    if (!track) throw new Error('No track provided');

    // 1. Check IndexedDB (Tier 1 Cache)
    try {
      const idbCached = await cacheManager.getAudio(track.id);
      if (idbCached) {
        if (Date.now() - idbCached.timestamp > CACHE_TTL_MS) {
          console.log(`[MusicSourceManager] Cached YouTube URL expired, removing.`);
          await cacheManager.removeAudio(track.id);
        } else {
          console.log(`[MusicSourceManager] IndexedDB hit for: ${track.title}`);
          return idbCached;
        }
      }
    } catch (e) {
      console.warn(`[MusicSourceManager] IndexedDB read failed: ${e.message}`);
    }

    // 2. Check localStorage (Tier 2 Cache)
    const lsCached = this.getLocalCached(track);
    if (lsCached) {
      console.log(`[MusicSourceManager] localStorage hit for: ${track.title}`);
      this.saveToAllCaches(track, lsCached);
      return lsCached;
    }

    // 3. Fetch YouTube Direct (Primary Source)
    try {
      console.log(`[MusicSourceManager] Fetching from YouTube for: ${track.title}`);
      const ytResult = await this.fetchYouTube(track);
      if (ytResult && ytResult.url) {
        this.saveToAllCaches(track, ytResult);
        return ytResult;
      }
    } catch (err) {
      console.warn(`[MusicSourceManager] YouTube fetch failed for: ${track.title}`, err.message);
      // Clear cache entry to prevent infinite loop
      StreamCache.set(track.id, null);
    }

    throw new Error('Unable to play this song');
  }

  /**
   * Prefetch a track in the background and cache it.
   */
  async prefetch(track) {
    if (!track || !track.id) return;

    try {
      const idbCached = await cacheManager.getAudio(track.id);
      if (idbCached) {
        if (Date.now() - idbCached.timestamp <= CACHE_TTL_MS) {
          return; // Valid cache hit
        }
      }
    } catch (e) {}

    if (this.getLocalCached(track)) return;

    try {
      console.log(`[MusicSourceManager] Prefetching via YouTube: ${track.title}`);
      const ytResult = await this.fetchYouTube(track);
      if (ytResult && ytResult.url) {
        this.saveToAllCaches(track, ytResult);
      }
    } catch (err) {
      console.warn(`[MusicSourceManager] YouTube prefetch failed for: ${track.title}`, err.message);
      // Clear cache entry to prevent infinite loop
      StreamCache.set(track.id, null);
    }
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

    // Try simpler queries in order as per specifications
    const attempts = [
      { title: `${title} ${artist}`, artist: '' },
      { title: `${title} audio`, artist: '' },
      { title: `${title}`, artist: '' },
      { title: `${artist} ${title.split(' ').slice(0, 2).join(' ')}`, artist: '' }
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
    this.retryCount = 0;

    for (let i = 0; i < unique.length; i++) {
      // Add Max Retry Limit
      if (this.retryCount >= this.maxRetries) {
        console.log('❌ Max retries reached, failing gracefully');
        this.retryCount = 0;
        break;
      }
      this.retryCount++;

      const { title: t, artist: a } = unique[i];
      try {
        console.log(`[MusicSourceManager] YouTube attempt ${i + 1}: "${t}" by "${a}"`);
        const streamUrl = `${API_URL}/api/stream/${track.id}?title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`;
        const res = await fetch(streamUrl);
        if (!res.ok) throw new Error(`Backend returned ${res.status}`);
        const data = await res.json();

        if (data.url) {
          this.retryCount = 0; // Reset retry count on success
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
