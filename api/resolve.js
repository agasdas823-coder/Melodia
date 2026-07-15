import { resolveTrack, isYouTubeConfigured } from '../lib/youtubeApi.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const title = (req.query.title || '').trim();
  const artist = (req.query.artist || '').trim();

  if (!title || !artist) {
    return res.status(400).json({ success: false, error: { message: 'title and artist query parameters are required.' } });
  }

  if (!isYouTubeConfigured()) {
    return res.status(503).json({ success: false, error: { message: 'YouTube API key is not configured.' } });
  }

  try {
    const song = await resolveTrack(title, artist);
    if (!song) {
      return res.status(404).json({ success: false, error: { message: 'No matching video found on YouTube.' } });
    }
    return res.json({ success: true, ...song });
  } catch (error) {
    console.error('Resolve track error:', error);
    return res.status(502).json({ success: false, error: { message: error.message || 'Failed to resolve track.' } });
  }
}
