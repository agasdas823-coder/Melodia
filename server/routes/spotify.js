import express from 'express';
import axios from 'axios';
import { getTrack, searchTracks, isConfigured } from '../services/spotifyService.js';
import * as itunes from '../spotify.js';

const router = express.Router();

router.get('/token', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        success: false,
        error: 'Spotify client credentials or refresh token are not configured.'
      });
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return res.json({
      success: true,
      access_token: response.data.access_token,
      token_type: response.data.token_type,
      expires_in: response.data.expires_in
    });
  } catch (error) {
    console.error('Spotify token error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }
    if (!isConfigured()) {
      return res.status(503).json({ success: false, error: 'Spotify is not configured on this server' });
    }

    const tracks = await searchTracks(q, Number(limit) || 20);
    return res.json({
      success: true,
      source: 'spotify',
      count: tracks.length,
      songs: tracks,
      cached: false,
    });
  } catch (error) {
    console.error('Spotify search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

router.get('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Track ID is required' });
    }
    if (!isConfigured()) {
      return res.status(503).json({ success: false, error: 'Spotify is not configured on this server' });
    }
    const track = await getTrack(id);
    if (!track) {
      return res.status(404).json({ success: false, error: 'Spotify track not found' });
    }
    return res.json({ success: true, track, source: 'spotify' });
  } catch (error) {
    console.error('Spotify track error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Expose iTunes search for preview fallback
router.get('/itunes/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'q required' });
    const results = await itunes.searchTracks(q, Number(limit) || 10);
    return res.json({ success: true, count: results.length, songs: results });
  } catch (err) {
    console.error('iTunes search error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/itunes/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'id required' });
    const track = await itunes.getTrack(id);
    if (!track) return res.status(404).json({ success: false, error: 'not found' });
    return res.json({ success: true, track });
  } catch (err) {
    console.error('iTunes track error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Redirect user to Spotify authorization page (Authorization Code Flow)
router.get('/auth', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback`;
  const state = Math.random().toString(36).substring(2, 15);
  const scope = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state'
  ].join(' ');

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  return res.redirect(authUrl);
});

// Callback: exchange code for tokens and redirect to frontend with tokens in query
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/spotify/callback`;
    if (!code) return res.status(400).send('Missing code');

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(), {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    // Redirect back to client app with tokens (small dev-friendly approach)
    const clientRedirect = process.env.CLIENT_APP_URL || 'http://localhost:5174';
    const redirectTo = `${clientRedirect}/?spotify_access_token=${encodeURIComponent(access_token)}&spotify_refresh_token=${encodeURIComponent(refresh_token)}&expires_in=${encodeURIComponent(expires_in)}`;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('Spotify callback error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Refresh token exchange: accepts { refresh_token } in JSON body and returns a new access token
router.post('/refresh', express.json(), async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ success: false, error: 'refresh_token is required' });
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }).toString(), {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return res.json({ success: true, data: tokenRes.data });
  } catch (err) {
    console.error('Spotify refresh error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

// Exchange server-stored refresh token (one-time granted by you) for a user access token
router.get('/token-user', async (req, res) => {
  try {
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!refresh_token || !clientId || !clientSecret) {
      return res.status(200).json({ success: false, access_token: null, error: 'Server refresh token or client credentials not configured.' });
    }

    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }).toString(), {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return res.json({ success: true, access_token: tokenRes.data.access_token, expires_in: tokenRes.data.expires_in, token_type: tokenRes.data.token_type });
  } catch (err) {
    console.error('token-user error:', err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

export default router;
