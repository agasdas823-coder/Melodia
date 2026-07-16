import axios from 'axios';

const LRCLIB_BASE = 'https://lrclib.net/api';
const LRCLIB_TIMEOUT = 8000;
const LRCLIB_RETRY_MAX = 1;
const LRCLIB_BACKOFF_MS = 500;

function buildLrclibParams(title, artist) {
  const params = new URLSearchParams();
  if (title) params.append('track_name', title);
  if (artist) params.append('artist_name', artist);
  return params.toString();
}

function isTransientLrclibError(error) {
  const status = error?.response?.status;
  return (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ECONNREFUSED' ||
    status === 429 ||
    (status >= 500 && status < 600)
  );
}

function normalizeLyricsPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const syncedLyrics = typeof payload.syncedLyrics === 'string' && payload.syncedLyrics.trim()
    ? payload.syncedLyrics.trim()
    : null;

  const plainLyrics = typeof payload.plainLyrics === 'string' && payload.plainLyrics.trim()
    ? payload.plainLyrics.trim()
    : null;

  if (syncedLyrics || plainLyrics) {
    return {
      syncedLyrics,
      plainLyrics,
    };
  }

  // Some endpoints might return a raw lyrics field
  const rawLyrics = typeof payload.lyrics === 'string' && payload.lyrics.trim()
    ? payload.lyrics.trim()
    : null;

  if (rawLyrics) {
    return {
      syncedLyrics: null,
      plainLyrics: rawLyrics,
    };
  }

  return null;
}

async function queryLrclib(endpoint, title, artist, attempt = 0) {
  const params = buildLrclibParams(title, artist);
  const url = `${LRCLIB_BASE}/${endpoint}?${params}`;
  const start = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: LRCLIB_TIMEOUT,
      validateStatus: (status) => status >= 200 && status < 500,
    });
    const latency = Date.now() - start;
    console.log(`🎵 [Lyrics] LRCLIB ${endpoint} success for ${title} / ${artist} (${response.status}) ${latency}ms`);
    return response.data;
  } catch (error) {
    const latency = Date.now() - start;
    console.warn(`⚠️ [Lyrics] LRCLIB ${endpoint} error for ${title} / ${artist}:`, error.message, `status=${error?.response?.status || 'N/A'} latency=${latency}ms`);
    if (attempt < LRCLIB_RETRY_MAX && isTransientLrclibError(error)) {
      const backoff = LRCLIB_BACKOFF_MS * (attempt + 1);
      console.log(`🔁 [Lyrics] Retrying LRCLIB ${endpoint} after ${backoff}ms`);
      await delay(backoff);
      return queryLrclib(endpoint, title, artist, attempt + 1);
    }
    throw error;
  }
}

async function searchLrclibLyrics(title, artist) {
  const data = await queryLrclib('search', title, artist);
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const bestMatch = data.find((item) => normalizeLyricsPayload(item)) || data[0];
  return normalizeLyricsPayload(bestMatch);
}

async function getLrclibLyrics(title, artist) {
  const data = await queryLrclib('get', title, artist);
  return normalizeLyricsPayload(data);
}

export async function getLyrics(req, res) {
  try {
    const title = String(req.query.title || '').trim();
    const artist = String(req.query.artist || '').trim();

    if (!title) {
      return res.status(400).json({
        found: false,
        success: false,
        lyrics: null,
      });
    }

    console.log('🎵 [Lyrics] Fetching lyrics for:', title, 'by', artist || 'Unknown');

    try {
      const searchResult = await searchLrclibLyrics(title, artist);
      if (searchResult) {
        const lyricsText = searchResult.syncedLyrics || searchResult.plainLyrics || null;
        console.log('✅ [Lyrics] LRCLIB search returned lyrics');
        return res.status(200).json({
          found: true,
          success: true,
          source: 'lrclib',
          title,
          artist,
          syncedLyrics: searchResult.syncedLyrics,
          plainLyrics: searchResult.plainLyrics,
          lyrics: lyricsText,
        });
      }
    } catch (searchError) {
      console.warn('⚠️ [Lyrics] LRCLIB search failed:', searchError.message);
    }

    try {
      const getResult = await getLrclibLyrics(title, artist);
      if (getResult) {
        const lyricsText = getResult.syncedLyrics || getResult.plainLyrics || null;
        console.log('✅ [Lyrics] LRCLIB get returned lyrics');
        return res.status(200).json({
          found: true,
          success: true,
          source: 'lrclib',
          title,
          artist,
          syncedLyrics: getResult.syncedLyrics,
          plainLyrics: getResult.plainLyrics,
          lyrics: lyricsText,
        });
      }
    } catch (getError) {
      console.warn('⚠️ [Lyrics] LRCLIB get failed:', getError.message);
    }

    console.log('❌ [Lyrics] No lyrics found on LRCLIB');
    return res.status(404).json({
      found: false,
      success: false,
      title,
      artist,
    });
  } catch (error) {
    console.error('❌ [Lyrics] Controller error:', error.message);
    return res.status(404).json({
      found: false,
      success: false,
      title: req.query.title || null,
      artist: req.query.artist || null,
    });
  }
}
