// server/routes/musicRoutes.js
import express from 'express';
import axios from 'axios';
import { callGroqAPI } from '../controllers/aiController.js';
import { getLyrics as getLrclibLyrics } from '../controllers/lyricsController.js';
import {
  searchMusic,
  getTrackById,
  getPlaylistById as getPlaylistByServiceId,
} from '../services/youtubeService.js';
import {
  getSongs,
  getSongById,
  getSongLyrics,
  getSongPreview,
  getPlaylistById,
} from '../controllers/songController.js';

const router = express.Router();

// ── GET /api/search - Search with type filtering ──
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, type = 'all' } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const results = await searchMusic(q, Number(limit) || 20, type);

    return res.status(200).json({
      success: true,
      type,
      count: results.length,
      songs: results,
      source: results.length ? 'youtube' : 'mock',
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/resolve - Resolve track to YouTube video ──
router.get('/resolve', async (req, res) => {
  try {
    const { title, artist } = req.query;
    
    if (!title || !artist) {
      return res.status(400).json({
        success: false,
        error: 'Title and artist are required'
      });
    }

    console.log('🔍 [Resolve] Searching for:', title, 'by', artist);

    // Use the existing search functionality
    const mockReq = {
      query: {
        q: `${artist} ${title} official audio`,
        type: 'song',
        limit: 5
      }
    };
    
    let result = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (data.songs && data.songs.length > 0) {
            // Find the best match - prefer official audio
            const songs = data.songs;
            // Try to find an official audio version first
            let bestMatch = songs.find(s => 
              s.title?.toLowerCase().includes('official') || 
              s.title?.toLowerCase().includes('audio') ||
              s.title?.toLowerCase().includes('lyric')
            );
            // If no official version, take the first result
            if (!bestMatch && songs.length > 0) {
              bestMatch = songs[0];
            }
            result = bestMatch;
          }
        }
      })
    };
    const mockNext = (err) => {
      console.error('Resolve error:', err);
    };

    await getSongs(mockReq, mockRes, mockNext);

    if (result) {
      console.log('✅ [Resolve] Found:', result.title);
      res.json(result);
    } else {
      res.status(404).json({
        success: false,
        error: 'No matching video found'
      });
    }
  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/playlist/:id - Get playlist with songs ──
router.get('/playlist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📡 [ROUTE] Playlist request received for ID:', id);

    const playlist = await getPlaylistByServiceId(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found' });
    }

    return res.status(200).json({ success: true, playlist });
  } catch (error) {
    console.error('❌ [ROUTE] Playlist error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/track/:id - Get track by ID ──
router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const song = await getTrackById(id);
    if (!song) {
      return res.status(404).json({ success: false, error: 'Track not found' });
    }
    return res.status(200).json({ success: true, song });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ── GET /api/stream-preview/:id - Preview streaming ──
router.get('/stream-preview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let track = null;
    const mockReq = { params: { id } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (data.song) {
            track = data.song;
          }
        }
      })
    };
    const mockNext = () => {};

    await getSongById(mockReq, mockRes, mockNext);

    if (!track || !track.previewUrl) {
      return res.status(404).json({
        success: false,
        error: 'No preview available'
      });
    }

    const response = await axios({
      method: 'get',
      url: track.previewUrl,
      responseType: 'stream',
      timeout: 10000
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    response.data.pipe(res);
  } catch (error) {
    console.error('Preview stream error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/songs - Direct access to songs with filters ──
router.get('/songs', async (req, res) => {
  try {
    const { sort, artist, q, type = 'all', limit = 20 } = req.query;
    await getSongs(req, res);
  } catch (error) {
    console.error('Songs error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/songs/:id - Get single song ──
router.get('/songs/:id', async (req, res) => {
  try {
    await getSongById(req, res);
  } catch (error) {
    console.error('Song error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/lyrics - Get lyrics by title and artist ──
router.get('/lyrics', async (req, res) => {
  try {
    await getLrclibLyrics(req, res);
  } catch (error) {
    console.error('❌ Lyrics route error:', error);
    return res.status(404).json({
      found: false,
      success: false,
      title: req.query?.title ?? null,
      artist: req.query?.artist ?? null,
    });
  }
});

// ── GET /api/songs/:id/lyrics - Get lyrics (legacy) ──
router.get('/songs/:id/lyrics', async (req, res) => {
  try {
    await getSongLyrics(req, res);
  } catch (error) {
    console.error('Lyrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/songs/:id/preview - Get preview ──
router.get('/songs/:id/preview', async (req, res) => {
  try {
    await getSongPreview(req, res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── GET /api/sources - Get available sources ──
router.get('/sources', (req, res) => {
  res.json({
    success: true,
    sources: {
      youtube: {
        enabled: !!process.env.YOUTUBE_API_KEY,
        priority: 1,
        features: ['full_audio', 'metadata', 'playlists']
      },
      mock: {
        enabled: true,
        priority: 2,
        features: ['preview', 'metadata']
      }
    }
  });
});

// ── GET /api/youtube-playlist/:id - Get YouTube playlist ──
router.get('/youtube-playlist/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Playlist ID is required.' } 
      });
    }

    console.log('📡 [YouTube Playlist] Fetching playlist ID:', id);

    const playlist = await getPlaylistByServiceId(id);
    
    if (!playlist) {
      console.warn('❌ [YouTube Playlist] Playlist not found:', id);
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Playlist not found.' } 
      });
    }

    console.log('✅ [YouTube Playlist] Found playlist:', playlist.name || playlist.title);
    return res.json({ success: true, playlist });
  } catch (error) {
    console.error('❌ [YouTube Playlist] Fetch error:', error);
    return res.status(502).json({ 
      success: false, 
      error: { message: error.message || 'Failed to fetch playlist.' } 
    });
  }
});

export default router;