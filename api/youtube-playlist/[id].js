import { getPlaylist, isYouTubeConfigured } from '../../lib/youtubeApi.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Playlist ID is required.' } });
  }

  if (!isYouTubeConfigured()) {
    return res.status(503).json({
      success: false,
      error: { message: 'YouTube API key is not configured. Set YOUTUBE_API_KEY.' },
    });
  }

  try {
    const playlist = await getPlaylist(id);
    if (!playlist) {
      return res.status(404).json({ success: false, error: { message: 'Playlist not found.' } });
    }
    return res.json({ success: true, playlist });
  } catch (error) {
    console.error('YouTube playlist fetch error:', error);
    return res.status(502).json({ success: false, error: { message: error.message || 'Failed to fetch playlist.' } });
  }
}
