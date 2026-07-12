import ytdl from '@distube/ytdl-core';

// In-memory cache for Vercel lambdas (cached during warm instances)
const urlCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query; // dynamic route param from [id].js
  const { title, artist } = req.query;

  const isYoutubeId = id && id.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(id);

  if (!isYoutubeId && (!title || !artist)) {
    return res.status(400).json({ success: false, error: { message: 'YouTube ID or title/artist parameters are required.' } });
  }

  try {
    const cacheKey = isYoutubeId ? `ytid:${id}` : `${artist}|${title}`.toLowerCase();

    if (urlCache.has(cacheKey)) {
      console.log(`[Vercel Serverless Cache Hit] ${cacheKey}`);
      return res.json({ url: urlCache.get(cacheKey) });
    }

    const videoId = isYoutubeId ? id : null;
    if (!videoId) {
      return res.status(400).json({ success: false, error: { message: 'Extracting streams without direct YouTube ID is not supported on serverless functions.' } });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Extract using @distube/ytdl-core
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    
    if (format && format.url) {
      urlCache.set(cacheKey, format.url);
      return res.json({ url: format.url });
    }

    return res.status(502).json({ success: false, error: { message: 'Could not extract audio URL.' } });
  } catch (err) {
    console.error(`[Serverless Stream Error] Failed for ID ${id}:`, err.message);
    return res.status(502).json({
      success: false,
      error: { message: `Stream extraction failed: ${err.message}` },
    });
  }
}
