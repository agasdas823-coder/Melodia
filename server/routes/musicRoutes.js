import express from 'express';
import YouTubeSR from 'youtube-sr';
import ytSearch from 'yt-search';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';
import NodeCache from 'node-cache';
// genius-lyrics removed — its default token was revoked by Genius, causing HTML responses.
// We now use LRCLIB (free, open-source, no auth) + Lyrics.ovh as fallback.

const router = express.Router();
const YouTube = YouTubeSR.default ?? YouTubeSR;

const SEARCH_LIMIT = 20;

// URL cache (1-hour TTL) for direct stream URLs
const urlCache = new NodeCache({ stdTTL: 3600 });

// Helper: convert milliseconds -> "m:ss"
function fmtDurationMs(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ── GET /api/search?q=…&limit=20 ─────────────────────────────────────────────
router.get('/search', async (req, res, next) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || SEARCH_LIMIT, 50);
  const type = req.query.type || 'all';

  if (!q) {
    return res.status(400).json({ success: false, error: { message: 'Query parameter "q" is required.' } });
  }

  let attributeParam = '';
  if (type === 'artist') attributeParam = '&attribute=artistTerm';
  else if (type === 'album') attributeParam = '&attribute=albumTerm';
  else if (type === 'song') attributeParam = '&attribute=songTerm';

  try {
    if (type === 'playlist' || type === 'album') {
      // youtube-sr's playlist search is broken with YouTube's new UI.
      // Scrape YouTube search results directly with the playlist filter (sp=EgIQAw%3D%3D).
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAw%3D%3D`;
      const ytResp = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const htmlMatch = ytResp.data.match(/var ytInitialData = (.+?);<\/script>/s);
      if (!htmlMatch) {
        return res.json({ success: true, count: 0, songs: [] });
      }

      const ytData = JSON.parse(htmlMatch[1]);
      const items = ytData?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents?.[0]
        ?.itemSectionRenderer?.contents || [];

      const playlists = items
        .filter(item => item.lockupViewModel)
        .slice(0, limit)
        .map(item => {
          const vm = item.lockupViewModel;
          const title = vm?.metadata?.lockupMetadataViewModel?.title?.content || 'Untitled';
          const thumbSrc = vm?.contentImage?.collectionThumbnailViewModel
            ?.primaryThumbnail?.thumbnailViewModel?.image?.sources;
          const thumbnail = thumbSrc?.[thumbSrc.length - 1]?.url || '';
          const badgeText = vm?.contentImage?.collectionThumbnailViewModel
            ?.primaryThumbnail?.thumbnailViewModel?.overlays?.[0]
            ?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]
            ?.thumbnailBadgeViewModel?.text || '';
          const videoCount = parseInt(badgeText) || 0;
          const metaRows = vm?.metadata?.lockupMetadataViewModel?.metadata
            ?.contentMetadataViewModel?.metadataRows || [];
          const channelName = metaRows?.[0]?.metadataParts?.[0]?.text?.content || 'YouTube';

          return {
            id: vm.contentId,
            _id: vm.contentId,
            title,
            name: title,
            artist: channelName,
            type: 'playlist',
            thumbnail,
            thumbnail_medium: thumbnail,
            coverArtUrl: thumbnail,
            videoCount,
          };
        });

      return res.json({ success: true, count: playlists.length, songs: playlists });
    } else {
      // Use YouTube Search for individual songs
      // We append " audio" to the query as requested by the task
      let songs = [];

      const searchAndFilter = async (searchStr) => {
        let result = null;
        try {
          result = await ytSearch(searchStr);
        } catch (err) {
          console.error('ytSearch error:', err);
        }
        
        if (!result || !result.videos) return [];
        return result.videos
          .filter(v => {
            const seconds = v.duration?.seconds || 0;
            if (seconds < 90) return false;
            if (seconds > 1200) return false; // Increased max duration to 20 mins to allow longer live tracks
            const title = (v.title || '').toLowerCase();
            if (title.includes('podcast') || title.includes('tutorial')) return false;
            if (title.includes('gaming') || title.includes('montage')) return false;
            // Also filter out obvious huge compilations
            if (title.includes('jukebox') || title.includes('non stop') || title.includes('non-stop')) return false;
            return true;
          })
          .slice(0, limit)
          .map((v) => {
            const seconds = v.duration?.seconds || 0;
            const thumbnail = v.thumbnail || '';
            return {
              id: v.videoId, _id: v.videoId, title: v.title, name: v.title,
              artist: v.author?.name || 'YouTube', artists: [{ name: v.author?.name || 'YouTube' }],
              album: 'YouTube Single',
              thumbnail: thumbnail, thumbnail_medium: thumbnail, coverArtUrl: thumbnail,
              duration: seconds, duration_ms: seconds * 1000,
              duration_string: v.duration?.timestamp || fmtDurationMs(seconds * 1000),
              views: v.views || '', url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
              audioUrl: null, audio_url: null, previewUrl: null, preview_url: null, type: 'song'
            };
          });
      };

      // Try with " audio" suffix first
      songs = await searchAndFilter(`${q} audio`);
      
      // Fallback to raw query if nothing found (e.g. artist searches flooded with jukeboxes)
      if (songs.length === 0) {
        songs = await searchAndFilter(q);
      }
      
      if (songs.length > 0) {
        return res.json({ success: true, count: songs.length, songs });
      }
      return res.json({ success: true, count: 0, songs: [] });
    }
  } catch (err) {
    console.error('[/api/search] search failed:', err.message);
    next(err);
  }
});

// ── GET /api/youtube-playlist/:id ───────────────────────────────────────────────
router.get('/youtube-playlist/:id', async (req, res, next) => {
  try {
    const playlistId = req.params.id;
    const pageUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const ytResp = await axios.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const htmlMatch = ytResp.data.match(/var ytInitialData = (.+?);<\/script>/s);
    if (!htmlMatch) {
      return res.status(404).json({ success: false, error: { message: 'Playlist not found.' } });
    }

    const data = JSON.parse(htmlMatch[1]);

    // Extract playlist title & thumbnail from sidebar
    const sidebar = data?.sidebar?.playlistSidebarRenderer?.items?.[0]?.playlistSidebarPrimaryInfoRenderer;
    const playlistTitle = data?.header?.pageHeaderRenderer?.pageTitle
      || sidebar?.title?.runs?.[0]?.text
      || 'YouTube Playlist';
    const sidebarThumbs = sidebar?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails;
    const playlistThumb = sidebarThumbs?.[sidebarThumbs.length - 1]?.url || '';

    // Extract channel name from sidebar secondary info
    const sidebarSecondary = data?.sidebar?.playlistSidebarRenderer?.items?.[1]
      ?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text;
    const channelName = sidebarSecondary || 'YouTube';

    // Extract videos from lockupViewModels
    const sections = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const items = sections?.[0]?.itemSectionRenderer?.contents || [];

    const songs = items
      .filter(item => item.lockupViewModel)
      .map(item => {
        const vm = item.lockupViewModel;
        const videoId = vm.contentId;
        const title = vm?.metadata?.lockupMetadataViewModel?.title?.content || 'Untitled';
        const thumbSources = vm?.contentImage?.thumbnailViewModel?.image?.sources;
        const thumbnail = thumbSources?.[thumbSources.length - 1]?.url || playlistThumb;
        const durationText = vm?.contentImage?.thumbnailViewModel?.overlays?.[0]
          ?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.text || '0:00';
        const artist = vm?.metadata?.lockupMetadataViewModel?.metadata
          ?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content || channelName;

        // Parse duration "m:ss" or "h:mm:ss" to seconds
        const durParts = durationText.split(':').map(Number);
        let durationSecs = 0;
        if (durParts.length === 3) durationSecs = durParts[0] * 3600 + durParts[1] * 60 + durParts[2];
        else if (durParts.length === 2) durationSecs = durParts[0] * 60 + durParts[1];

        return {
          id: videoId,
          _id: videoId,
          title,
          name: title,
          artist,
          artists: [{ name: artist }],
          album: playlistTitle,
          thumbnail,
          thumbnail_medium: thumbnail,
          coverArtUrl: thumbnail,
          duration: durationSecs,
          duration_ms: durationSecs * 1000,
          duration_string: durationText,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          type: 'song',
        };
      });

    return res.json({
      success: true,
      playlist: {
        id: playlistId,
        title: playlistTitle,
        artist: channelName,
        thumbnail: playlistThumb,
        videoCount: songs.length,
        songs,
      },
    });
  } catch (err) {
    console.error('[/api/youtube-playlist] failed:', err.message);
    next(err);
  }
});

// ── GET /api/track/:id ────────────────────────────────────────────────────────
// Fetches track metadata by iTunes ID or YouTube Video ID
router.get('/track/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, error: 'No track ID provided' });

    // If it's an all-numeric ID, it's an iTunes ID
    if (/^\d+$/.test(id)) {
      const response = await axios.get(`https://itunes.apple.com/lookup?id=${id}`);
      if (response.data && response.data.results && response.data.results.length > 0) {
        const track = response.data.results[0];
        const highResArtwork = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null;
        
        const song = {
          id: track.trackId.toString(),
          _id: track.trackId.toString(),
          title: track.trackName,
          name: track.trackName,
          artist: track.artistName,
          artists: [{ name: track.artistName }],
          album: track.collectionName || 'Single',
          thumbnail: highResArtwork,
          thumbnail_medium: track.artworkUrl100,
          coverArtUrl: highResArtwork,
          duration: Math.floor(track.trackTimeMillis / 1000),
          duration_ms: track.trackTimeMillis,
          duration_string: fmtDurationMs(track.trackTimeMillis),
          url: track.trackViewUrl,
          type: 'song'
        };
        return res.json({ success: true, song });
      } else {
        return res.status(404).json({ success: false, error: 'Track not found on iTunes' });
      }
    }

    // Otherwise, assume it's a YouTube Video ID
    const vid = await YouTube.getVideo(`https://www.youtube.com/watch?v=${id}`);
    if (!vid) return res.status(404).json({ success: false, error: 'Video not found on YouTube' });

    const song = {
      id: vid.id,
      _id: vid.id,
      title: vid.title,
      name: vid.title,
      artist: vid.channel?.name || 'YouTube',
      artists: [{ name: vid.channel?.name || 'YouTube' }],
      album: 'Single',
      thumbnail: vid.thumbnail?.url || '',
      thumbnail_medium: vid.thumbnail?.url || '',
      coverArtUrl: vid.thumbnail?.url || '',
      duration: Math.floor(vid.duration / 1000) || 0,
      duration_ms: vid.duration || 0,
      duration_string: vid.durationFormatted || fmtDurationMs(vid.duration || 0),
      url: `https://www.youtube.com/watch?v=${vid.id}`,
      type: 'song'
    };

    return res.json({ success: true, song });
  } catch (err) {
    console.error('[/api/track] failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

async function findYouTubeVideo(track) {
  const rawName   = track.trackName  || '';
  const rawArtist = track.artistName || '';

  // ── Helper: derive title variants ─────────────────────────────────────────
  const noParens   = rawName.replace(/\([^)]*\)/g, '').trim();
  const noFeat     = rawName.replace(/\bfeat\..*$/i, '').replace(/\bfeaturing\b.*$/i, '').trim();
  const noFeatClean= noParens.replace(/\bfeat\..*$/i, '').replace(/\bfeaturing\b.*$/i, '').trim();
  const firstWord  = rawName.split(/[\s\-–]+/)[0];
  const firstPart  = rawName.split(/[,\-–(]/)[0].trim(); // up to first comma/dash/paren
  const artistFirst= rawArtist.split(/[\s,&]+/)[0];

  // Build all unique name variants to try
  const nameVariants = [
    rawName,
    noFeat,
    noParens,
    noFeatClean,
    firstPart,
    firstWord,
  ].filter(Boolean);

  // ── Build prioritised query list ───────────────────────────────────────────
  const queries = [];

  // 1. Most specific first (name + artist, various suffixes)
  for (const name of nameVariants.slice(0, 3)) {
    queries.push(`${name} ${rawArtist} official audio`);
    queries.push(`${name} ${rawArtist} audio`);
    queries.push(`${name} ${rawArtist}`);
  }

  // 2. Name-only (no artist)
  for (const name of nameVariants.slice(0, 4)) {
    queries.push(`${name} official audio`);
    queries.push(`${name} audio`);
    queries.push(`${name}`);
  }

  // 3. Artist + first word of song (for short/common titles)
  if (firstWord.length > 2) {
    queries.push(`${rawArtist} ${firstWord}`);
    queries.push(`${artistFirst} ${firstWord}`);
  }

  // 4. Last resort: just the artist (pick their most popular upload)
  queries.push(`${rawArtist} official`);
  queries.push(`${rawArtist}`);

  // Deduplicate
  const seen = new Set();
  const allQueries = queries.filter(q => {
    const k = q.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // ── Helper: is this video a bad match? ─────────────────────────────────────
  function isBadVideo(v) {
    const seconds = typeof v.duration === 'number'
      ? Math.round(v.duration / 1000)
      : (v.duration?.seconds || 0);
    if (seconds > 0 && seconds < 30) return true;          // too short
    const t = (v.title || '').toLowerCase();
    if (/\b(top\s*\d+|best\s+of|greatest\s+hits|megamix|non.?stop)\b/.test(t)) return true; // obvious compilations
    return false;
  }

  // ── Search loop ─────────────────────────────────────────────────────────────
  for (const query of allQueries) {
    console.log('[YouTube] Trying:', query);
    try {
      const videos = await YouTube.search(query, { limit: 10, type: 'video', safeSearch: false });
      if (!videos || videos.length === 0) continue;

      const filtered = videos.filter(v => !isBadVideo(v));

      // Prefer official channel or "official" in title
      const official = filtered.find(v =>
        v.title?.toLowerCase().includes('official') ||
        v.channel?.verified
      );
      if (official) { console.log('[YouTube] Found (official) with:', query); return official; }

      if (filtered.length > 0) { console.log('[YouTube] Found with:', query); return filtered[0]; }

      // No filtered result — accept the first raw result if it exists
      if (videos.length > 0 && !isBadVideo(videos[0])) {
        console.log('[YouTube] Found (raw fallback) with:', query);
        return videos[0];
      }
    } catch (err) {
      console.warn(`[YouTube] Search failed for "${query}":`, err.message);
    }
  }

  // Absolute last resort — raw first result of most likely query, no filters
  for (const query of allQueries.slice(0, 5)) {
    try {
      const videos = await YouTube.search(query, { limit: 1, type: 'video', safeSearch: false });
      if (videos?.[0]) {
        console.log('[YouTube] Last resort with:', query);
        return videos[0];
      }
    } catch (_) {}
  }

  return null;
}

// ── GET /api/stream/:id — return direct URL from YouTube ──────────────────────
// Strategy: Try youtube-dl-exec first (needs Python, works locally).
//           If it fails, fall back to @distube/ytdl-core (pure Node.js, works on Railway).
router.get('/stream/:id', async (req, res, next) => {
  const { title, artist } = req.query;
  const id = req.params.id;
  const isYoutubeId = id && id.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(id);

  if (!isYoutubeId && (!title || !artist)) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  try {
    const cacheKey = isYoutubeId ? `ytid:${id}` : `${artist}|${title}`.toLowerCase();

    // Before extraction: Check backend URL cache
    if (urlCache.has(cacheKey)) {
      console.log(`[Backend Cache Hit] ${cacheKey}`);
      return res.json({ url: urlCache.get(cacheKey) });
    }

    let matchedVideo = null;
    if (isYoutubeId) {
      matchedVideo = { id };
    } else {
      // Search YouTube using progressive helper
      matchedVideo = await findYouTubeVideo({ trackName: title, artistName: artist });
    }

    if (!matchedVideo) {
      return res.status(404).json({ success: false, error: { message: 'Could not find a matching YouTube video.' } });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${matchedVideo.id}`;

    // ── Method 1: @distube/ytdl-core ──
    try {
      const info = await ytdl.getInfo(videoUrl);
      const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
      if (format && format.url) {
        urlCache.set(cacheKey, format.url);
        return res.json({ url: format.url });
      }
    } catch (ytdlErr) {
      console.warn(`[/api/stream] ytdl-core failed, attempting Cobalt fallback: ${ytdlErr.message}`);
    }

    // ── Method 2: Cobalt Proxy Fallback ──
    const cobaltInstances = [
      'https://dog.kittycat.boo',
      'https://cobaltapi.kittycat.boo',
      'https://api.cobalt.liubquanti.click'
    ];

    for (const inst of cobaltInstances) {
      try {
        const response = await axios.post(inst, {
          url: videoUrl,
          downloadMode: 'audio'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 8000
        });

        const data = response.data;
        if (data && data.url && (data.status === 'stream' || data.status === 'tunnel' || data.status === 'redirect')) {
          urlCache.set(cacheKey, data.url);
          console.log(`[/api/stream] Extraction succeeded via Cobalt instance: ${inst}`);
          return res.json({ url: data.url });
        }
      } catch (cobaltErr) {
        console.warn(`[/api/stream] Cobalt instance ${inst} failed: ${cobaltErr.message}`);
      }
    }

    return res.status(502).json({ success: false, error: { message: 'Could not extract audio URL from ytdl-core or any Cobalt proxy.' } });
  } catch (err) {
    console.error(`[/api/stream] Failed for ID ${id} (${title} - ${artist}):`, err.message);
    return res.status(502).json({
      success: false,
      error: { message: `Stream extraction failed: ${err.message}` },
    });
  }
});

// ── GET /api/lyrics — Fetch lyrics via LRCLIB (primary) with fallback to Lyrics.ovh ────────────
router.get('/lyrics', async (req, res, next) => {
  const { title, artist } = req.query;
  if (!title || !artist) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  try {
    // 1. Try LRCLIB (free, open-source, no auth needed)
    const lrclibRes = await axios.get('https://lrclib.net/api/search', {
      params: { q: `${artist} ${title}` },
      headers: { 'User-Agent': 'Melodia/1.0.0 (https://github.com/melodia)' },
      timeout: 5000
    });
    if (lrclibRes.data && lrclibRes.data.length > 0) {
      const match = lrclibRes.data[0];
      const lyrics = match.plainLyrics || match.syncedLyrics;
      if (lyrics) {
        return res.json({
          success: true,
          lyrics,
          source: 'LRCLIB'
        });
      }
    }
  } catch (err) {
    console.warn(`[LRCLIB] Failed to fetch lyrics for ${title} - ${artist}:`, err.message);
  }

  try {
    // 2. Fallback to Lyrics.ovh
    const ovhResponse = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
      timeout: 8000
    });
    if (ovhResponse.data && ovhResponse.data.lyrics) {
      return res.json({
        success: true,
        lyrics: ovhResponse.data.lyrics,
        source: 'Lyrics.ovh'
      });
    }
  } catch (err) {
    console.warn(`[Lyrics.ovh] Failed to fetch lyrics for ${title} - ${artist}:`, err.message);
  }

  // 3. Both failed
  return res.json({
    success: false,
    lyrics: "Lyrics not available.",
    error: { message: 'Could not find lyrics in any provider.' }
  });
});

export default router;
