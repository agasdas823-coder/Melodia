// Vercel serverless proxy — forwards fast stream requests to the Railway Express backend
// where the Python bridge (yt-dlp) extracts direct audio streaming URLs.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id, title, artist } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Video ID is required.' } });
  }

  // Forward to Railway backend
  const railwayUrl = process.env.RAILWAY_BACKEND_URL || 'https://melody-production-0d59.up.railway.app';
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (artist) params.set('artist', artist);
  const queryStr = params.toString() ? `?${params.toString()}` : '';

  try {
    const upstream = await fetch(`${railwayUrl}/api/music/stream/${id}${queryStr}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[Vercel Music Stream Proxy] Failed:', err.message);
    return res.status(502).json({
      success: false,
      error: { message: `Proxy to Railway failed: ${err.message}` },
    });
  }
}
