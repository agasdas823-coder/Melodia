// Vercel serverless function — redirects legacy stream requests to the Railway Express backend.

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Video ID is required.' } });
  }

  const railwayUrl = process.env.RAILWAY_BACKEND_URL || 'https://melody-production-0d59.up.railway.app';
  
  // Forward all query parameters (like title and artist) to the backend metadata endpoint
  const queryStr = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  return res.redirect(`${railwayUrl}/api/stream/${id}${queryStr}`);
}
