import axios from 'axios';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const searchCache = new Map();

function getApiKey() {
  return process.env.YOUTUBE_API_KEY || '';
}

export function isYouTubeConfigured() {
  return !!process.env.YOUTUBE_API_KEY;
}

function parseIsoDuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function fmtDurationMs(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatDurationString(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function isGoodMusicVideo(video) {
  const seconds = video.duration || 0;
  if (seconds > 0 && seconds < 90) return false;
  if (seconds > 1200) return false;
  const title = (video.title || '').toLowerCase();
  if (title.includes('podcast') || title.includes('tutorial')) return false;
  if (title.includes('gaming') || title.includes('montage')) return false;
  if (title.includes('jukebox') || title.includes('non stop') || title.includes('non-stop')) return false;
  return true;
}

function formatVideo(video) {
  const seconds = video.duration || 0;
  const thumbnail =
    video.thumbnail ||
    `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

  return {
    id: video.id,
    _id: video.id,
    videoId: video.id,
    title: video.title,
    name: video.title,
    artist: video.channel || 'YouTube',
    artists: [{ name: video.channel || 'YouTube' }],
    album: 'YouTube Single',
    thumbnail,
    thumbnail_medium: thumbnail,
    coverArtUrl: thumbnail,
    duration: seconds,
    duration_ms: seconds * 1000,
    duration_string: formatDurationString(seconds),
    views: video.views || '',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    audioUrl: null,
    audio_url: null,
    previewUrl: null,
    preview_url: null,
    type: 'song',
    source: 'youtube',
  };
}

async function fetchVideoDetails(videoIds) {
  if (!videoIds.length) return [];

  const { data } = await axios.get(`${BASE_URL}/videos`, {
    params: {
      part: 'contentDetails,snippet,statistics',
      id: videoIds.join(','),
      key: getApiKey(),
    },
    timeout: 10000,
  });

  return (data.items || []).map((item) => ({
    id: item.id,
    title: item.snippet?.title || 'Untitled',
    channel: item.snippet?.channelTitle || 'YouTube',
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    duration: parseIsoDuration(item.contentDetails?.duration),
    views: item.statistics?.viewCount || '',
  }));
}

/**
 * Trending music (category 10) — used as quota fallback.
 */
export async function getTrendingMusic(limit = 20) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const { data } = await axios.get(`${BASE_URL}/videos`, {
    params: {
      part: 'snippet,contentDetails,statistics',
      chart: 'mostPopular',
      videoCategoryId: '10',
      regionCode: 'US',
      maxResults: Math.min(limit, 50),
      key: apiKey,
    },
    timeout: 10000,
  });

  return (data.items || []).map((item) =>
    formatVideo({
      id: item.id,
      title: item.snippet?.title || 'Untitled',
      channel: item.snippet?.channelTitle || 'YouTube',
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
      duration: parseIsoDuration(item.contentDetails?.duration),
      views: item.statistics?.viewCount || '',
    })
  );
}

/**
 * Search YouTube for music videos via Data API v3 (music category).
 */
export async function searchVideos(query, limit = 20) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const cacheKey = `${query}:${limit}`;
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const runSearch = async (searchQuery) => {
    const { data } = await axios.get(`${BASE_URL}/search`, {
      params: {
        part: 'snippet',
        type: 'video',
        videoCategoryId: '10',
        q: searchQuery,
        maxResults: Math.min(limit + 10, 50),
        key: apiKey,
        videoEmbeddable: true,
      },
      timeout: 10000,
    });

    const videoIds = (data.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

    if (!videoIds.length) return [];

    const details = await fetchVideoDetails(videoIds);
    return details
      .filter(isGoodMusicVideo)
      .slice(0, limit)
      .map(formatVideo);
  };

  try {
    let songs = await runSearch(`${query} audio`);
    if (!songs.length) {
      songs = await runSearch(query);
    }

    searchCache.set(cacheKey, songs);
    if (searchCache.size > 100) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }

    return songs;
  } catch (error) {
    if (error?.response?.status === 403 || error?.response?.status === 429) {
      console.warn('[YouTube API] Quota exceeded, returning trending music fallback.');
      return getTrendingMusic(limit);
    }
    throw error;
  }
}

/**
 * Resolve a track title + artist to a YouTube video (for playback).
 */
export async function resolveTrack(title, artist) {
  const query = `${artist} ${title} official audio`.trim();
  const results = await searchVideos(query, 1);
  return results[0] || null;
}

/**
 * Search YouTube for playlists via Data API v3.
 */
export async function searchPlaylists(query, limit = 20) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const { data } = await axios.get(`${BASE_URL}/search`, {
    params: {
      part: 'snippet',
      type: 'playlist',
      q: query,
      maxResults: Math.min(limit, 50),
      key: apiKey,
    },
    timeout: 10000,
  });

  const items = (data.items || []).slice(0, limit);
  const playlistIds = items
    .map((item) => item.id?.playlistId)
    .filter(Boolean);

  let countMap = {};
  if (playlistIds.length > 0) {
    try {
      const { data: detailsData } = await axios.get(`${BASE_URL}/playlists`, {
        params: {
          part: 'contentDetails',
          id: playlistIds.join(','),
          key: apiKey,
          maxResults: Math.min(playlistIds.length, 50),
        },
        timeout: 10000,
      });

      countMap = (detailsData.items || []).reduce((map, item) => {
        const id = item.id;
        const count = item.contentDetails?.itemCount ?? 0;
        if (id) map[id] = count;
        return map;
      }, {});
    } catch (error) {
      console.warn('[YouTube API] Failed to fetch playlist details for counts:', error.message || error);
    }
  }

  return items.map((item) => {
    const snippet = item.snippet || {};
    const playlistId = item.id?.playlistId || '';
    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '';

    return {
      id: playlistId,
      _id: playlistId,
      title: snippet.title || 'Untitled',
      name: snippet.title || 'Untitled',
      artist: snippet.channelTitle || 'YouTube',
      type: 'playlist',
      source: 'youtube',
      thumbnail,
      thumbnail_medium: thumbnail,
      coverArtUrl: thumbnail,
      videoCount: countMap[playlistId] ?? 0,
    };
  });
}

/**
 * Fetch a single video's metadata by ID.
 */
export async function getVideo(videoId) {
  const apiKey = getApiKey();
  if (!apiKey || !videoId) return null;

  const details = await fetchVideoDetails([videoId]);
  if (!details.length) return null;

  return formatVideo(details[0]);
}

/**
 * Fetch playlist metadata and videos via Data API v3.
 */
export async function getPlaylist(playlistId) {
  const apiKey = getApiKey();
  if (!apiKey || !playlistId) return null;

  const { data: playlistData } = await axios.get(`${BASE_URL}/playlists`, {
    params: {
      part: 'snippet,contentDetails',
      id: playlistId,
      key: apiKey,
    },
    timeout: 10000,
  });

  const playlist = playlistData.items?.[0];
  if (!playlist) return null;

  const snippet = playlist.snippet || {};
  const playlistThumb =
    snippet.thumbnails?.high?.url ||
    snippet.thumbnails?.medium?.url ||
    snippet.thumbnails?.default?.url ||
    '';

  let playlistItems = [];
  let nextPageToken = null;

  do {
    const { data: itemsData } = await axios.get(`${BASE_URL}/playlistItems`, {
      params: {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: 50,
        pageToken: nextPageToken,
        key: apiKey,
      },
      timeout: 10000,
    });

    playlistItems = playlistItems.concat(itemsData.items || []);
    nextPageToken = itemsData.nextPageToken;
  } while (nextPageToken);

  const videoIds = playlistItems
    .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const detailsBatches = await Promise.all(chunks.map((chunk) => fetchVideoDetails(chunk)));
  const details = detailsBatches.flat();
  const detailMap = Object.fromEntries(details.map((v) => [v.id, v]));

  const songs = playlistItems
    .map((item) => {
      const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      const detail = detailMap[videoId];
      const itemSnippet = item.snippet || {};

      if (detail) return formatVideo(detail);

      return {
        id: videoId,
        _id: videoId,
        videoId,
        title: itemSnippet.title || 'Untitled',
        name: itemSnippet.title || 'Untitled',
        artist: itemSnippet.videoOwnerChannelTitle || snippet.channelTitle || 'YouTube',
        artists: [{ name: itemSnippet.videoOwnerChannelTitle || snippet.channelTitle || 'YouTube' }],
        album: snippet.title || 'YouTube Playlist',
        thumbnail: playlistThumb,
        thumbnail_medium: playlistThumb,
        coverArtUrl: playlistThumb,
        duration: 0,
        duration_ms: 0,
        duration_string: '0:00',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        type: 'song',
        source: 'youtube',
      };
    })
    .filter((song) => song.id);

  return {
    id: playlistId,
    title: snippet.title || 'YouTube Playlist',
    artist: snippet.channelTitle || 'YouTube',
    thumbnail: playlistThumb,
    videoCount: songs.length,
    songs,
  };
}
