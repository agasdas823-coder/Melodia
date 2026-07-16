import {
  searchVideos as searchYoutubeVideos,
  searchPlaylists as searchYoutubePlaylists,
  getVideo as getYoutubeVideo,
  getPlaylist as getYoutubePlaylist,
  getTrendingMusic as getYoutubeTrending,
  resolveTrack as resolveYoutubeTrack,
} from '../../lib/youtubeApi.js';

const SEARCH_CACHE = new Map();

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const value = Math.max(0, Math.floor(Number(seconds)));
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function normalizeTrack(track) {
  if (!track) return null;

  const artist = track.artist || track.artists?.[0]?.name || 'YouTube';
  const title = track.title || track.name || 'Untitled';
  const thumbnail = track.thumbnail || track.coverArtUrl || track.thumbnail_medium || '';
  const videoId = track.videoId || track.id || '';

  return {
    id: track.id || videoId,
    _id: track._id || track.id || videoId,
    videoId,
    title,
    name: track.name || title,
    artist,
    artists: Array.isArray(track.artists) && track.artists.length > 0
      ? track.artists
      : [{ name: artist }],
    album: track.album || 'YouTube Single',
    thumbnail,
    thumbnail_medium: track.thumbnail_medium || thumbnail,
    coverArtUrl: track.coverArtUrl || thumbnail,
    duration: track.duration ?? 0,
    duration_string: track.duration_string || formatDuration(track.duration ?? 0),
    previewUrl: track.previewUrl || null,
    audioUrl: track.audioUrl || null,
    spotifyUri: track.spotifyUri || null,
    spotifyUrl: track.spotifyUrl || null,
    url: track.url || `https://www.youtube.com/watch?v=${videoId}`,
    type: track.type || 'song',
    source: track.source || 'youtube',
  };
}

function normalizeMatchKey(value) {
  return String(value || '')
    .replace(/[\W_]+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildTrackMatchKey(track) {
  const title = normalizeMatchKey(track.title || track.name || '');
  const artist = normalizeMatchKey(track.artist || track.artists?.[0]?.name || '');
  return `${title}|${artist}`;
}

function normalizeSearchValue(value) {
  if (!value) return '';
  return String(value)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[-–—]\s*(official|audio|video|lyric|lyrics)(.*)$/gi, '')
    .replace(/\b(official|audio|video|lyric|lyrics)\b/gi, '')
    .replace(/[.,/#!$%^&*;:{}=+_`~?"'\[\]]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanTrackArtist(value) {
  return normalizeSearchValue(String(value || '')
    .replace(/\s*[-–—]\s*(topic|vevo|official|audio|video|lyric|lyrics)$/gi, '')
    .replace(/\b(topic|vevo)\b/gi, '')
    .trim());
}

function normalizePlaylist(playlist) {
  if (!playlist) return null;

  const thumbnail = playlist.thumbnail || playlist.coverImageUrl || playlist.thumbnail_medium || '';

  return {
    id: playlist.id || playlist._id || '',
    _id: playlist._id || playlist.id || '',
    title: playlist.title || playlist.name || 'Untitled Playlist',
    name: playlist.name || playlist.title || 'Untitled Playlist',
    description: playlist.description || '',
    artist: playlist.artist || 'YouTube',
    coverImageUrl: playlist.coverImageUrl || thumbnail,
    thumbnail,
    thumbnail_medium: playlist.thumbnail_medium || thumbnail,
    coverArtUrl: playlist.coverArtUrl || thumbnail,
    songs: Array.isArray(playlist.songs) ? playlist.songs.map(normalizeTrack).filter(Boolean) : [],
    videoCount: playlist.videoCount || 0,
    isAiGenerated: Boolean(playlist.isAiGenerated),
    createdBy: playlist.createdBy || 'YouTube',
    type: 'playlist',
    source: playlist.source || 'youtube',
    url: playlist.url || `https://www.youtube.com/playlist?list=${playlist.id || playlist._id}`,
  };
}

export async function searchMusic(query, limit = 20, type = 'all') {
  const searchQuery = (query || '').trim();
  if (!searchQuery) return [];

  const cacheKey = `${searchQuery}:${limit}:${type}`;
  if (SEARCH_CACHE.has(cacheKey)) return SEARCH_CACHE.get(cacheKey);

  try {
    let results = [];

    if (type === 'playlist' || type === 'album') {
      const playlists = await searchYoutubePlaylists(searchQuery, limit);
      results = (playlists || []).map(normalizePlaylist);
    } else {
      const songs = await searchYoutubeVideos(searchQuery, limit);
      results = (songs || []).map(normalizeTrack);
    }

    SEARCH_CACHE.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('[youtubeService] searchMusic error:', error.message);
    return [];
  }
}

export async function getTrackById(trackId) {
  if (!trackId) return null;

  try {
    const video = await getYoutubeVideo(trackId);
    return normalizeTrack(video);
  } catch (error) {
    console.error('[youtubeService] getTrackById error:', error.message);
    return null;
  }
}

export async function getPlaylistById(playlistId) {
  if (!playlistId) return null;

  try {
    const playlist = await getYoutubePlaylist(playlistId);
    return normalizePlaylist(playlist);
  } catch (error) {
    console.error('[youtubeService] getPlaylistById error:', error.message);
    return null;
  }
}

export async function getTrendingMusic(limit = 20) {
  try {
    const tracks = await getYoutubeTrending(limit);
    return (tracks || []).map(normalizeTrack);
  } catch (error) {
    console.error('[youtubeService] getTrendingMusic error:', error.message);
    return [];
  }
}

export async function resolveTrack(title, artist) {
  if (!title && !artist) return null;

  try {
    const track = await resolveYoutubeTrack(title, artist);
    return normalizeTrack(track);
  } catch (error) {
    console.error('[youtubeService] resolveTrack error:', error.message);
    return null;
  }
}

export default {
  searchMusic,
  getTrackById,
  getPlaylistById,
  getTrendingMusic,
  resolveTrack,
};
