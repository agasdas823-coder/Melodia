import express from 'express';
import YouTubeSR from 'youtube-sr';
import youtubedl from 'youtube-dl-exec';
import axios from 'axios';
import { Client } from 'genius-lyrics';

const router = express.Router();
const YouTube = YouTubeSR.default ?? YouTubeSR;
const genius = new Client(); // Free tier

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
// Fetches track metadata by YouTube Video ID
router.get('/track/:id', async (req, res, next) => {
  try {
    const videoId = req.params.id;
    if (!videoId) return res.status(400).json({ success: false, error: 'No video ID provided' });

    const vid = await YouTube.getVideo(`https://www.youtube.com/watch?v=${videoId}`);
    if (!vid) return res.status(404).json({ success: false, error: 'Video not found' });

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
// The browser can't fetch googlevideo.com directly (CORS), so we pipe the bytes
// through our own server. Howler.js points at this URL with html5:true.
router.get('/stream/:id', async (req, res, next) => {
  const { title, artist } = req.query;

  if (!title || !artist) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  try {
    const cacheKey = `${artist}|${title}`.toLowerCase();
    let streamUrl;
    let contentType;

    // Check cache first
    const cached = streamCache.get(cacheKey);
    if (cached && (Date.now() - cached.resolvedAt < STREAM_CACHE_TTL_MS)) {
      streamUrl = cached.url;
      contentType = cached.contentType;
    } else {
      // Resolve fresh URL
      const searchQuery = `${artist} - ${title} audio`;
      const videos = await YouTube.search(searchQuery, { limit: 1, type: 'video', safeSearch: false });

      if (!videos || videos.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Could not find a matching YouTube video.' } });
      }

      const videoId = videos[0].id;
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      const output = await youtubedl(url, {
        dumpJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true,
      });

      const format = output.formats
        .filter(f => f.acodec !== 'none' && f.vcodec === 'none')
        .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

      if (!format || !format.url) {
        return res.status(404).json({ success: false, error: { message: 'No streamable format found for this video.' } });
      }

      streamUrl = format.url;
      contentType = format.acodec === 'mp4a.40.2' ? 'audio/mp4' : 'audio/webm';

      // Store in cache
      streamCache.set(cacheKey, { url: streamUrl, contentType, resolvedAt: Date.now() });
    }

    // Support Range requests for seeking in Howler.js html5 mode
    const rangeHeader = req.headers.range;
    const headers = { 'User-Agent': 'Mozilla/5.0' };
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    // Pipe the audio from googlevideo through our server
    const upstream = await axios.get(streamUrl, {
      responseType: 'stream',
      headers,
    });

    const statusCode = upstream.status;
    res.status(statusCode);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    if (upstream.headers['content-range']) {
      res.setHeader('Content-Range', upstream.headers['content-range']);
    }

    upstream.data.pipe(res);
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

// ── GET /api/lyrics — Fetch lyrics via Genius API with fallback to Lyrics.ovh ────────────────
router.get('/lyrics', async (req, res, next) => {
  const { title, artist } = req.query;
  if (!title || !artist) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  try {
    // 1. Try Genius API
    const searches = await genius.songs.search(`${artist} ${title}`);
    if (searches && searches.length > 0) {
      // Find the first result that roughly matches
      const firstSong = searches[0];
      const lyrics = await firstSong.lyrics();
      
      if (lyrics) {
        return res.json({
          success: true,
          lyrics,
          source: 'Genius'
        });
      }
    }
  } catch (err) {
    console.warn(`[Genius API] Failed to fetch lyrics for ${title} - ${artist}:`, err.message);
  }

  try {
    // 2. Fallback to Lyrics.ovh
    const ovhResponse = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
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
