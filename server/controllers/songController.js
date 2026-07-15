// server/controllers/songController.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import NodeCache from 'node-cache';

// ── Force load .env from server directory ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths
const envPaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`✅ [songController] Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ── Cache for API responses (1 hour TTL) ──
const searchCache = new NodeCache({ stdTTL: 3600 });

// ── Debug: Log API key status ──
console.log(`🔍 [songController] YouTube API Key: ${YOUTUBE_API_KEY ? '✅ Configured' : '❌ MISSING'}`);
console.log(`🔍 [songController] YouTube API Key length: ${YOUTUBE_API_KEY?.length || 0}`);

// ── Mock Tracks (Fallback when YouTube rate limit hits) ──
const MOCK_TRACKS = [
  {
    _id: "track-1",
    id: "track-1",
    title: "Lofi Study",
    name: "Lofi Study",
    artist: "FASSounds",
    artists: [{ name: "FASSounds" }],
    album: "Study Beats",
    duration: 362,
    coverArtUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    popularity: 95,
    source: 'mock'
  },
  {
    _id: "track-2",
    id: "track-2",
    title: "Ambient Gold",
    name: "Ambient Gold",
    artist: "SergeQuadrado",
    artists: [{ name: "SergeQuadrado" }],
    album: "Golden Ambient",
    duration: 373,
    coverArtUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    popularity: 88,
    source: 'mock'
  },
  {
    _id: "track-3",
    id: "track-3",
    title: "Summer Breeze",
    name: "Summer Breeze",
    artist: "Alex-Productions",
    artists: [{ name: "Alex-Productions" }],
    album: "Summer Vibes",
    duration: 302,
    coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    popularity: 92,
    source: 'mock'
  },
  {
    _id: "track-4",
    id: "track-4",
    title: "Chill Lofi Beat",
    name: "Chill Lofi Beat",
    artist: "LofiDreamer",
    artists: [{ name: "LofiDreamer" }],
    album: "Lo-Fi Nights",
    duration: 302,
    coverArtUrl: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    popularity: 81,
    source: 'mock'
  },
  {
    _id: "track-5",
    id: "track-5",
    title: "Upbeat Synthwave",
    name: "Upbeat Synthwave",
    artist: "RetroFuture",
    artists: [{ name: "RetroFuture" }],
    album: "Outrun",
    duration: 273,
    coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    popularity: 97,
    source: 'mock'
  }
];

// ── Helper Functions ──
function parseDuration(duration) {
  const match = duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match?.[1] || 0);
  const minutes = parseInt(match?.[2] || 0);
  const seconds = parseInt(match?.[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── YouTube Search for Videos (with caching and retry) ──
async function searchYouTubeVideos(query, limit = 20, retryCount = 0) {
  const cacheKey = `video:${query}:${limit}`;
  
  if (searchCache.has(cacheKey)) {
    console.log('📦 [CACHE HIT] Returning cached video results for:', query);
    return searchCache.get(cacheKey);
  }

  try {
    if (!YOUTUBE_API_KEY) {
      console.warn('⚠️ YouTube API key not configured');
      return [];
    }

    console.log(`🔍 [YouTube] Searching videos: "${query}"`);

    const response = await axios.get(`${YT_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${query} audio`,
        type: 'video',
        videoCategoryId: '10',
        maxResults: Math.min(limit, 50),
        key: YOUTUBE_API_KEY,
      },
    });

    const videoIds = response.data.items.map(item => item.id.videoId).filter(Boolean);
    if (!videoIds.length) return [];

    const detailsResponse = await axios.get(`${YT_API_BASE}/videos`, {
      params: {
        part: 'contentDetails,statistics,snippet',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY,
      },
    });

    const results = detailsResponse.data.items
      .map(video => {
        const duration = parseDuration(video.contentDetails.duration);
        if (duration < 60 || duration > 1200) return null;

        return {
          _id: video.id,
          id: video.id,
          videoId: video.id,
          title: video.snippet.title,
          name: video.snippet.title,
          artist: video.snippet.channelTitle,
          artists: [{ name: video.snippet.channelTitle }],
          album: 'YouTube Single',
          duration: duration,
          duration_string: formatDuration(duration),
          coverArtUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          thumbnail_medium: video.snippet.thumbnails.medium?.url || '',
          url: `https://www.youtube.com/watch?v=${video.id}`,
          type: 'song',
          source: 'youtube',
          popularity: parseInt(video.statistics?.viewCount) || 0,
        };
      })
      .filter(Boolean);

    searchCache.set(cacheKey, results);
    console.log(`✅ [YouTube] Found ${results.length} videos for: "${query}"`);
    return results;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`⚠️ [YouTube] Rate limit hit (429) for: "${query}"`);
      if (searchCache.has(cacheKey)) {
        console.log('📦 [CACHE] Returning cached data despite rate limit');
        return searchCache.get(cacheKey);
      }
      if (retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ [YouTube] Waiting ${waitTime}ms before retry ${retryCount + 1}/3...`);
        await delay(waitTime);
        return searchYouTubeVideos(query, limit, retryCount + 1);
      }
      console.warn('⚠️ [YouTube] Max retries reached, returning empty');
      return [];
    }
    console.error('❌ [YouTube] Search error:', error.message);
    return [];
  }
}

// ── YouTube Search for Playlists (with caching and retry) ──
async function searchYouTubePlaylists(query, limit = 20, retryCount = 0) {
  const cacheKey = `playlist:${query}:${limit}`;
  
  if (searchCache.has(cacheKey)) {
    console.log('📦 [CACHE HIT] Returning cached playlist results for:', query);
    return searchCache.get(cacheKey);
  }

  try {
    if (!YOUTUBE_API_KEY) {
      console.warn('⚠️ YouTube API key not configured');
      return [];
    }

    console.log(`🔍 [YouTube] Searching playlists: "${query}"`);

    const response = await axios.get(`${YT_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: query,
        type: 'playlist',
        maxResults: Math.min(limit, 50),
        key: YOUTUBE_API_KEY,
      },
    });

    const playlists = await Promise.all(
      (response.data.items || []).map(async (item) => {
        const playlistId = item.id?.playlistId;
        if (!playlistId) return null;

        try {
          const playlistDetails = await axios.get(`${YT_API_BASE}/playlists`, {
            params: {
              part: 'contentDetails,snippet',
              id: playlistId,
              key: YOUTUBE_API_KEY,
            },
          });

          const details = playlistDetails.data.items?.[0];
          const snippet = item.snippet || {};

          return {
            _id: playlistId,
            id: playlistId,
            title: snippet.title || 'Untitled Playlist',
            name: snippet.title || 'Untitled Playlist',
            artist: snippet.channelTitle || 'YouTube',
            artists: [{ name: snippet.channelTitle || 'YouTube' }],
            type: 'playlist',
            thumbnail: snippet.thumbnails?.high?.url || 
                      snippet.thumbnails?.medium?.url || 
                      snippet.thumbnails?.default?.url || '',
            thumbnail_medium: snippet.thumbnails?.medium?.url || '',
            coverArtUrl: snippet.thumbnails?.high?.url || '',
            videoCount: parseInt(details?.contentDetails?.itemCount) || 0,
            url: `https://www.youtube.com/playlist?list=${playlistId}`,
            source: 'youtube',
          };
        } catch (err) {
          return {
            _id: playlistId,
            id: playlistId,
            title: item.snippet?.title || 'Untitled Playlist',
            name: item.snippet?.title || 'Untitled Playlist',
            artist: item.snippet?.channelTitle || 'YouTube',
            type: 'playlist',
            thumbnail: item.snippet?.thumbnails?.high?.url || '',
            videoCount: 0,
            url: `https://www.youtube.com/playlist?list=${playlistId}`,
            source: 'youtube',
          };
        }
      })
    );

    const results = playlists.filter(Boolean).slice(0, limit);
    searchCache.set(cacheKey, results);
    console.log(`✅ [YouTube] Found ${results.length} playlists for: "${query}"`);
    return results;
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn(`⚠️ [YouTube] Rate limit hit (429) for playlist search: "${query}"`);
      if (searchCache.has(cacheKey)) {
        console.log('📦 [CACHE] Returning cached playlist data despite rate limit');
        return searchCache.get(cacheKey);
      }
      if (retryCount < 3) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        console.log(`⏳ [YouTube] Waiting ${waitTime}ms before retry ${retryCount + 1}/3...`);
        await delay(waitTime);
        return searchYouTubePlaylists(query, limit, retryCount + 1);
      }
      console.warn('⚠️ [YouTube] Max retries reached for playlists, returning empty');
      return [];
    }
    console.error('❌ [YouTube] Playlist search error:', error.message);
    return [];
  }
}

// ── Get Playlist with Songs ──
async function getPlaylistWithSongs(playlistId) {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    console.log(`📺 Fetching playlist: ${playlistId}`);

    const playlistRes = await axios.get(`${YT_API_BASE}/playlists`, {
      params: {
        part: 'snippet',
        id: playlistId,
        key: YOUTUBE_API_KEY,
      },
    });

    const playlist = playlistRes.data.items?.[0];
    if (!playlist) return null;

    let allItems = [];
    let nextPageToken = null;

    do {
      const itemsRes = await axios.get(`${YT_API_BASE}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: 50,
          pageToken: nextPageToken,
          key: YOUTUBE_API_KEY,
        },
      });

      allItems = [...allItems, ...(itemsRes.data.items || [])];
      nextPageToken = itemsRes.data.nextPageToken || null;
    } while (nextPageToken);

    const videoIds = allItems
      .map(item => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    const songs = await Promise.all(
      videoIds.map(async (videoId) => {
        try {
          const videoRes = await axios.get(`${YT_API_BASE}/videos`, {
            params: {
              part: 'contentDetails,statistics,snippet',
              id: videoId,
              key: YOUTUBE_API_KEY,
            },
          });

          const video = videoRes.data.items?.[0];
          if (!video) return null;

          const duration = parseDuration(video.contentDetails?.duration);
          if (duration < 60 || duration > 1200) return null;

          return {
            _id: videoId,
            id: videoId,
            videoId: videoId,
            title: video.snippet?.title || 'Untitled',
            name: video.snippet?.title || 'Untitled',
            artist: video.snippet?.channelTitle || 'Unknown',
            artists: [{ name: video.snippet?.channelTitle || 'Unknown' }],
            thumbnail: video.snippet?.thumbnails?.high?.url || '',
            duration: duration,
            duration_string: formatDuration(duration),
            url: `https://www.youtube.com/watch?v=${videoId}`,
            type: 'song',
            source: 'youtube',
          };
        } catch (err) {
          return null;
        }
      })
    );

    const validSongs = songs.filter(Boolean);

    return {
      _id: playlistId,
      id: playlistId,
      title: playlist.snippet?.title || 'Untitled Playlist',
      artist: playlist.snippet?.channelTitle || 'YouTube',
      thumbnail: playlist.snippet?.thumbnails?.high?.url || '',
      videoCount: validSongs.length,
      songs: validSongs,
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
      source: 'youtube',
      type: 'playlist',
    };
  } catch (error) {
    console.error('❌ Get playlist error:', error.message);
    return null;
  }
}

// ── GET /api/songs - Get songs with YouTube search + mock fallback ──
export async function getSongs(req, res, next) {
  try {
    const { sort, artist, q, type = 'all', limit = 20 } = req.query;
    let songs = [];

    if (q) {
      const query = q.toLowerCase();
      let youtubeResults = [];

      switch (type) {
        case 'playlist':
          youtubeResults = await searchYouTubePlaylists(query, parseInt(limit));
          songs = youtubeResults.map(item => ({ ...item, type: 'playlist' }));
          break;

        case 'album':
          const albums = await searchYouTubePlaylists(query, parseInt(limit));
          songs = albums.map(item => ({ ...item, type: 'album' }));
          break;

        case 'song':
          const youtubeSongs = await searchYouTubeVideos(query, parseInt(limit));
          songs = youtubeSongs.map(item => ({ ...item, type: 'song' }));
          break;

        default:
          const allSongs = await searchYouTubeVideos(query, parseInt(limit));
          const allPlaylists = await searchYouTubePlaylists(query, parseInt(limit / 2) || 5);
          songs = [
            ...allSongs.map(item => ({ ...item, type: 'song' })),
            ...allPlaylists.map(item => ({ ...item, type: 'playlist' })),
          ];
          break;
      }

      if (songs.length === 0) {
        console.warn(`⚠️ [getSongs] No results found for query: "${query}"`);
        return res.status(200).json({ 
          success: true,
          source: 'youtube',
          type: type,
          count: 0,
          songs: [],
          message: `No results found for "${query}". Try different keywords.`
        });
      }

      if (sort === 'trending') {
        songs.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      }

      return res.status(200).json({ 
        success: true, 
        source: 'youtube',
        type: type,
        count: songs.length, 
        songs
      });
    }

    songs = [...MOCK_TRACKS];

    if (artist) {
      const art = artist.toLowerCase();
      songs = songs.filter(s => s.artist.toLowerCase().includes(art));
    }

    if (sort === 'trending') {
      songs.sort((a, b) => b.popularity - a.popularity);
    }

    return res.status(200).json({ 
      success: true, 
      source: 'mock',
      count: songs.length, 
      songs,
      message: 'No search query provided - showing sample tracks. Try searching for artist or song name.'
    });
  } catch (error) {
    console.error('❌ Get songs error:', error);
    next(error);
  }
}

// ── GET /api/songs/:id - Get song by ID ──
export async function getSongById(req, res, next) {
  try {
    const { id } = req.params;
    
    let song = MOCK_TRACKS.find(s => s.id === id || s._id === id);
    
    if (!song && YOUTUBE_API_KEY) {
      try {
        const videoRes = await axios.get(`${YT_API_BASE}/videos`, {
          params: {
            part: 'snippet,contentDetails,statistics',
            id: id,
            key: YOUTUBE_API_KEY,
          },
        });

        const video = videoRes.data.items?.[0];
        if (video) {
          const duration = parseDuration(video.contentDetails?.duration);
          song = {
            _id: video.id,
            id: video.id,
            videoId: video.id,
            title: video.snippet?.title || 'Untitled',
            name: video.snippet?.title || 'Untitled',
            artist: video.snippet?.channelTitle || 'Unknown',
            artists: [{ name: video.snippet?.channelTitle || 'Unknown' }],
            album: 'YouTube Single',
            duration: duration || 0,
            duration_string: formatDuration(duration || 0),
            coverArtUrl: video.snippet?.thumbnails?.high?.url || '',
            thumbnail: video.snippet?.thumbnails?.high?.url || '',
            url: `https://www.youtube.com/watch?v=${video.id}`,
            source: 'youtube',
            type: 'song',
            popularity: parseInt(video.statistics?.viewCount) || 0,
          };
        }
      } catch (err) {
        console.warn('YouTube video fetch failed:', err.message);
      }
    }

    if (!song) {
      return res.status(404).json({
        success: false,
        error: { code: 'SONG_NOT_FOUND', message: `No track found for id: ${id}` }
      });
    }

    return res.status(200).json({ success: true, song });
  } catch (error) {
    next(error);
  }
}

// ── GET /api/playlist/:playlistId - Get playlist with songs ──
export async function getPlaylistById(req, res, next) {
  try {
    const { playlistId } = req.params;
    
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    const playlistData = await getPlaylistWithSongs(playlistId);
    
    if (!playlistData) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({
      success: true,
      playlist: playlistData,
    });
  } catch (error) {
    console.error('❌ Get playlist error:', error);
    next(error);
  }
}

// ── GET /api/songs/:id/lyrics - Get song lyrics ──
export async function getSongLyrics(req, res, next) {
  try {
    const { id } = req.params;
    const song = MOCK_TRACKS.find(s => s.id === id || s._id === id);
    if (!song) {
      return res.status(404).json({ success: false, error: { message: 'Track not found' } });
    }
    const lyrics = `[00:00.00] Enjoy the beautiful melody of ${song.title} by ${song.artist}\n[00:15.00] This is a mock lyric visualization\n[00:30.00] Showing full synchronization\n[00:45.00] Restoring lyrics successfully!`;
    return res.status(200).json({ success: true, artist: song.artist, title: song.title, lyrics });
  } catch (error) {
    next(error);
  }
}

// ── GET /api/songs/:id/preview - Get song preview ──
export async function getSongPreview(req, res, next) {
  try {
    const { id } = req.params;
    const song = MOCK_TRACKS.find(s => s.id === id || s._id === id);
    if (!song) {
      return res.status(404).json({ success: false, previewUrl: null });
    }
    return res.status(200).json({ success: true, previewUrl: song.audioUrl });
  } catch (error) {
    next(error);
  }
}

