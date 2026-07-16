import axios from 'axios';
import NodeCache from 'node-cache';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET || 'US';

let accessToken = null;
let tokenExpiresAt = 0;
let spotifyRateLimitedUntil = 0;

const spotifySearchCache = new NodeCache({ stdTTL: 60 * 30, checkperiod: 120, useClones: false });

function getCachedSearch(cacheKey) {
  return cacheKey ? spotifySearchCache.get(cacheKey) || null : null;
}

function setCachedSearch(cacheKey, tracks) {
  if (!cacheKey || !Array.isArray(tracks)) return;
  spotifySearchCache.set(cacheKey, tracks);
}

function createSpotifyError(status, message, retryAfterSeconds = null) {
  const error = new Error(message || 'Spotify service error');
  error.response = {
    status,
    data: {
      error: {
        code: status === 429 ? 'SPOTIFY_RATE_LIMITED' : 'SPOTIFY_ERROR',
        message,
        retry_after: retryAfterSeconds,
      },
    },
  };
  return error;
}

function getCacheKey(query, limit) {
  return `${String(query || '').trim().toLowerCase()}:${normalizeSpotifySearchLimit(limit)}`;
}

function formatTrack(track) {
  return {
    id: track.id,
    _id: track.id,
    title: track.name,
    name: track.name,
    type: 'song',
    artist: track.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist',
    artists: track.artists || [],
    album: track.album?.name || 'Unknown Album',
    thumbnail: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
    thumbnail_medium: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url || '',
    coverArtUrl: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
    duration: Math.floor(track.duration_ms / 1000),
    duration_ms: track.duration_ms,
    duration_string: formatDuration(track.duration_ms),
    previewUrl: track.preview_url,
    preview_url: track.preview_url,
    audioUrl: track.preview_url,
    audio_url: track.preview_url,
    source: 'spotify',
    url: track.external_urls?.spotify || '',
    spotifyUri: track.uri,
    uri: track.uri,
    isPlayable: Boolean(track.uri),
    spotifyId: track.id,
    trackHref: track.href,
    externalUrl: track.external_urls?.spotify || '',
  };
}

function formatDuration(ms) {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials are not configured.');
  }

  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  accessToken = response.data.access_token;
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  return accessToken;
}

function normalizeSpotifySearchLimit(limit, defaultLimit = 20, maxLimit = 50) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
}

export async function searchTracks(query, limit = 20) {
  if (!query) return [];
  const safeLimit = normalizeSpotifySearchLimit(limit);
  const cacheKey = getCacheKey(query, safeLimit);
  const cached = getCachedSearch(cacheKey);
  if (cached) {
    return cached;
  }

  if (Date.now() < spotifyRateLimitedUntil) {
    throw createSpotifyError(429, 'Spotify search rate limit active', Math.ceil((spotifyRateLimitedUntil - Date.now()) / 1000));
  }

  let token = await getAccessToken();
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          q: query,
          type: 'track',
          market: SPOTIFY_MARKET,
          limit: safeLimit,
        },
      });

      const items = response.data?.tracks?.items || [];
      const results = items.map(formatTrack);
      setCachedSearch(cacheKey, results);
      return results;
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401 && attempt === 0) {
        accessToken = null;
        token = await getAccessToken();
        attempt += 1;
        continue;
      }

      if (status === 429) {
        const retryAfterHeader = error.response.headers?.['retry-after'];
        const retryAfterSeconds = Number(retryAfterHeader) || 10;
        const retryAfterMs = Math.min(Math.max(retryAfterSeconds * 1000, 1000), 60 * 1000);
        spotifyRateLimitedUntil = Date.now() + retryAfterMs;
        console.warn('[spotifyService] rate limited: blocking searches until', new Date(spotifyRateLimitedUntil).toISOString());
        throw createSpotifyError(429, 'Spotify search rate limited', retryAfterSeconds);
      }

      throw error;
    }
  }

  throw new Error('Spotify search failed after retry');
}

export async function getTrack(id) {
  if (!id) return null;
  const token = await getAccessToken();
  const response = await axios.get(`https://api.spotify.com/v1/tracks/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return formatTrack(response.data);
}

export function isConfigured() {
  return !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
}