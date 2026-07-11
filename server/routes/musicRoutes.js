import express from 'express';
import YouTubeSR from 'youtube-sr';
import youtubeDl from 'youtube-dl-exec';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';
// genius-lyrics removed — its default token was revoked by Genius, causing HTML responses.
// We now use LRCLIB (free, open-source, no auth) + Lyrics.ovh as fallback.

const router = express.Router();
const YouTube = YouTubeSR.default ?? YouTubeSR;

const SEARCH_LIMIT = 20;

// In-memory cache for resolved stream URLs (avoids re-running yt-dlp on every Range request/seek)
// Key: "artist|title", Value: { url, contentType, resolvedAt }
const streamCache = new Map();
const STREAM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (YouTube URLs expire after ~6h)

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
      // Use iTunes for individual songs
      const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}${attributeParam}`);
      
      if (response.data && response.data.results) {
        const songs = response.data.results.map((track) => {
          const highResArtwork = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null;
          
          return {
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
            views: '', 
            url: track.trackViewUrl,
            audioUrl: null,
            audio_url: null,
            previewUrl: track.previewUrl,
            preview_url: track.previewUrl,
            type: 'song'
          };
        });
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

// ── GET /api/stream/:id — proxy audio bytes from YouTube ──────────────────────
// Strategy: Try youtube-dl-exec first (needs Python, works locally).
//           If it fails, fall back to @distube/ytdl-core (pure Node.js, works on Railway).
router.get('/stream/:id', async (req, res, next) => {
  const { title, artist } = req.query;

  if (!title || !artist) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  try {
    const cacheKey = `${artist}|${title}`.toLowerCase();

    // Search YouTube for the track
    let videoUrl;
    const cached = streamCache.get(cacheKey);
    if (cached && (Date.now() - cached.resolvedAt < STREAM_CACHE_TTL_MS)) {
      videoUrl = cached.videoUrl;
    } else {
      const searchQuery = `${artist} - ${title} audio`;
      const videos = await YouTube.search(searchQuery, { limit: 1, type: 'video', safeSearch: false });

      if (!videos || videos.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Could not find a matching YouTube video.' } });
      }

      videoUrl = `https://www.youtube.com/watch?v=${videos[0].id}`;
      streamCache.set(cacheKey, { videoUrl, resolvedAt: Date.now() });
    }

    // ── Method 1: youtube-dl-exec (needs Python — works locally) ──
    try {
      const rawUrl = await youtubeDl(videoUrl, { getUrl: true, format: 'bestaudio' });

      if (rawUrl) {
        const streamUrl = rawUrl.trim();
        const contentType = streamUrl.includes('webm') ? 'audio/webm' : 'audio/mp4';

        const rangeHeader = req.headers.range;
        const headers = { 'User-Agent': 'Mozilla/5.0' };
        if (rangeHeader) headers['Range'] = rangeHeader;

        const upstream = await axios.get(streamUrl, { responseType: 'stream', headers });

        res.status(upstream.status);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
        if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);

        upstream.data.pipe(res);
        return; // Done — youtube-dl-exec worked
      }
    } catch (ytdlExecErr) {
      console.warn(`[/api/stream] youtube-dl-exec failed, falling back to ytdl-core: ${ytdlExecErr.message}`);
    }

    // ── Method 2: @distube/ytdl-core (pure Node.js — works on Railway) ──
    const audioStream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25, // 32MB buffer
    });

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    req.on('close', () => audioStream.destroy());

    audioStream.on('error', (err) => {
      console.error(`[/api/stream] ytdl-core error for ${title} - ${artist}:`, err.message);
      streamCache.delete(cacheKey);
      if (!res.headersSent) {
        return res.status(502).json({ success: false, error: { message: `Stream failed: ${err.message}` } });
      }
    });

    audioStream.pipe(res);
  } catch (err) {
    console.error(`[/api/stream] Failed for ${title} - ${artist}:`, err.message);
    if (!res.headersSent) {
      return res.status(502).json({
        success: false,
        error: { message: `Stream extraction failed: ${err.message}` },
      });
    }
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
