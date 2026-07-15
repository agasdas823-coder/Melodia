import {
  searchVideos,
  searchPlaylists,
  isYouTubeConfigured,
} from '../lib/youtubeApi.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = (req.query.q || req.query.query || '').trim();
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const type = req.query.type || 'all';

  if (!q) {
    return res.status(400).json({ success: false, error: { message: 'Query parameter "q" is required.' } });
  }

  if (!isYouTubeConfigured()) {
    return res.status(503).json({
      success: false,
      error: { message: 'YouTube API key is not configured. Set YOUTUBE_API_KEY.' },
    });
  }

  try {
    if (type === 'playlist' || type === 'album') {
      const playlists = await searchPlaylists(q, limit);
      return res.json({ success: true, count: playlists.length, songs: playlists });
    }

    const songs = await searchVideos(q, limit);
    return res.json({ success: true, count: songs.length, songs });
  } catch (error) {
    console.error('YouTube search error:', error);
    return res.status(502).json({ success: false, error: { message: error.message || 'Search failed.' } });
  }
}
