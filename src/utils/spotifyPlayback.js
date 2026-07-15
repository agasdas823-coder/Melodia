export function normalizeSpotifySearchValue(value) {
  if (!value) return '';
  return String(value)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[-–—]\s*(official|audio|video|lyric|lyrics)(.*)$/gi, '')
    .replace(/\b(official|audio|video|lyric|lyrics)\b/gi, '')
    .replace(/[.,/#!$%^&*;:{}=+_`~?"'\[\]]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeSpotifyArtistValue(value) {
  if (!value) return '';
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[-–—]\s*(?:topic|official|vevo|audio|video|lyrics?)(.*)$/gi, '')
    .replace(/\b(?:topic|official|vevo|audio|video|lyrics?)\b/gi, '')
    .replace(/[.,/#!$%^&*;:{}=+_`~?"'\[\]]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function buildSpotifyTrackQueries(track) {
  const title = normalizeSpotifySearchValue(track?.title || track?.name || '');
  const artist = normalizeSpotifyArtistValue(track?.artist || track?.artists?.[0]?.name || '');
  const queries = [];

  if (title && artist) {
    queries.push(`${title} ${artist}`);
  }

  if (title) queries.push(title);
  if (artist) queries.push(artist);
  if (title && artist) queries.push(`track:${title} artist:${artist}`);

  return Array.from(new Set(queries.filter(Boolean))).slice(0, 4);
}

export function getSpotifySearchCacheKey(track) {
  if (!track) return null;
  const title = normalizeSpotifySearchValue(track?.title || track?.name || '');
  const artist = normalizeSpotifyArtistValue(track?.artist || track?.artists?.[0]?.name || '');

  if (track.id) return track.id;
  if (track._id) return track._id;
  if (title || artist) return `${title}|${artist}`;
  return null;
}

export function pickBestSpotifyResult(results) {
  if (!Array.isArray(results) || !results.length) return null;

  const uriMatch = results.find((song) => song?.spotifyUri || song?.uri || song?.id);
  const previewMatch = results.find((song) => song?.previewUrl || song?.preview_url || song?.audioUrl || song?.audio_url);
  return uriMatch || previewMatch || results[0] || null;
}
