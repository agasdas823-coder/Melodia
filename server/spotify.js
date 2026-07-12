import axios from 'axios';

/**
 * iTunes Search API helper — completely free, no auth required.
 * Provides track metadata + 30-second M4A preview URLs.
 * Works globally without geo-restrictions.
 */

/**
 * Searches iTunes for tracks.
 * @param {string} query - Search query
 * @param {number} limit - Max results (default 20, max 200)
 * @returns {Array} Formatted track objects
 */
export async function searchTracks(query, limit = 20) {
  try {
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term: query,
        media: 'music',
        entity: 'song',
        limit: Math.min(limit, 200),
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.results) return [];
    return response.data.results.map(formatITunesTrack);
  } catch (error) {
    console.error('iTunes search error:', error.message);
    return [];
  }
}

/**
 * Gets a single track from iTunes by ID.
 * @param {string|number} id - iTunes track ID
 * @returns {object|null} Formatted track object
 */
export async function getTrack(id) {
  try {
    const response = await axios.get('https://itunes.apple.com/lookup', {
      params: { id },
      timeout: 10000,
    });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return null;
    }
    return formatITunesTrack(response.data.results[0]);
  } catch (error) {
    console.error(`iTunes lookup error for ${id}:`, error.message);
    return null;
  }
}

/**
 * Formats an iTunes track object to match Melodia's expected schema.
 */
function formatITunesTrack(track) {
  // Upgrade artwork to 600x600 for higher quality
  const artwork = (track.artworkUrl100 || '').replace('100x100bb', '600x600bb');

  return {
    id: String(track.trackId),
    _id: String(track.trackId),
    title: track.trackName || 'Unknown',
    name: track.trackName || 'Unknown',
    artist: track.artistName || 'Unknown Artist',
    artists: [{ name: track.artistName || 'Unknown Artist' }],
    album: track.collectionName || 'Unknown Album',
    thumbnail: artwork,
    thumbnail_medium: artwork,
    coverArtUrl: artwork,
    duration: (track.trackTimeMillis || 0) / 1000,
    duration_ms: track.trackTimeMillis || 0,
    duration_string: formatDurationMs(track.trackTimeMillis || 0),
    views: '',
    url: track.trackViewUrl || '',
    previewUrl: track.previewUrl || null,
    preview_url: track.previewUrl || null,
    audioUrl: track.previewUrl || null,
    audio_url: track.previewUrl || null,
    type: 'song',
  };
}

function formatDurationMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
