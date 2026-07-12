// Vercel serverless stream endpoint
// Uses Piped API (open-source YouTube proxy) to avoid bot detection on Vercel IPs

import axios from 'axios';

// In-memory cache (persists across warm lambda invocations)
const urlCache = new Map();

// Multiple Piped instances as fallbacks (community-run, no auth required)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://piped-api.codeberg.page',
  'https://api.piped.projectsegfau.lt',
];

async function getStreamUrlFromPiped(videoId) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const response = await axios.get(`${instance}/streams/${videoId}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Melodia/1.0.0',
        },
      });

      const data = response.data;

      // Find the best audio-only stream
      const audioStreams = data.audioStreams || [];
      // Prefer opus/webm, then aac/m4a, sorted by quality
      const sorted = audioStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const best = sorted[0];

      if (best && best.url) {
        return { url: best.url, source: instance };
      }
    } catch (err) {
      console.warn(`[Piped] Instance ${instance} failed: ${err.message}`);
      // Try next instance
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  const isYoutubeId = id && id.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(id);

  if (!isYoutubeId) {
    return res.status(400).json({ 
      success: false, 
      error: { message: 'A valid 11-character YouTube video ID is required.' } 
    });
  }

  try {
    const cacheKey = `ytid:${id}`;

    if (urlCache.has(cacheKey)) {
      const cached = urlCache.get(cacheKey);
      // Check if cached URL is still likely valid (stream URLs expire ~6hrs on YouTube)
      if (cached.timestamp && Date.now() - cached.timestamp < 3 * 60 * 60 * 1000) {
        console.log(`[Serverless Cache Hit] ${cacheKey}`);
        return res.json({ url: cached.url });
      }
      urlCache.delete(cacheKey);
    }

    const result = await getStreamUrlFromPiped(id);

    if (result && result.url) {
      urlCache.set(cacheKey, { url: result.url, timestamp: Date.now() });
      return res.json({ url: result.url, source: result.source });
    }

    return res.status(502).json({ 
      success: false, 
      error: { message: 'Could not extract audio URL from any Piped instance.' } 
    });

  } catch (err) {
    console.error(`[Serverless Stream Error] Failed for ID ${id}:`, err.message);
    return res.status(502).json({
      success: false,
      error: { message: `Stream extraction failed: ${err.message}` },
    });
  }
}
