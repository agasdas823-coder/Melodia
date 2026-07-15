import axios from 'axios';
import { getVideo, isYouTubeConfigured, fmtDurationMs } from '../../lib/youtubeApi.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'No track ID provided' });
  }

  try {
    if (/^\d+$/.test(id)) {
      const response = await axios.get(`https://itunes.apple.com/lookup?id=${id}`);
      const track = response.data?.results?.[0];
      if (!track) {
        return res.status(404).json({ success: false, error: 'Track not found on iTunes' });
      }

      const highResArtwork = track.artworkUrl100
        ? track.artworkUrl100.replace('100x100bb', '600x600bb')
        : null;

      return res.json({
        success: true,
        song: {
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
          type: 'song',
        },
      });
    }

    if (!isYouTubeConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'YouTube API key is not configured. Set YOUTUBE_API_KEY.',
      });
    }

    const song = await getVideo(id);
    if (!song) {
      return res.status(404).json({ success: false, error: 'Video not found on YouTube' });
    }

    return res.json({ success: true, song });
  } catch (error) {
    console.error('Track fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
