// Vercel serverless function — redirects the client directly to the Railway Express backend
// to stream audio. This bypasses Vercel's 10-second function timeout and 50MB response size limits.

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: { message: 'Video ID is required.' } });
  }

  const railwayUrl = process.env.RAILWAY_BACKEND_URL || 'https://melody-production-0d59.up.railway.app';
  
  // Perform HTTP 302 Redirect to the Railway backend streaming endpoint
  return res.redirect(`${railwayUrl}/api/music/stream/${id}`);
}
