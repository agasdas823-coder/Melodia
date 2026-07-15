// server/controllers/aiController.js
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Get current directory ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env from server directory ──
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ── Get API keys from environment ──
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ── Validate API keys on startup ──
if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in .env file!');
  console.error('   Please add GROQ_API_KEY=your_key to server/.env');
}
if (!YOUTUBE_API_KEY) {
  console.warn('⚠️  YOUTUBE_API_KEY is not set in .env file');
  console.warn('   YouTube search will not work properly');
}

// ── YouTube Search ──
async function searchYouTube(query, limit = 20) {
  try {
    if (!YOUTUBE_API_KEY) {
      console.warn('YouTube API key not configured');
      return [];
    }

    const response = await axios.get(`${YT_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: query,
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

    return detailsResponse.data.items.map(video => {
      const duration = parseDuration(video.contentDetails.duration);
      if (duration < 60 || duration > 1200) return null;

      return {
        id: video.id,
        videoId: video.id,
        title: video.snippet.title,
        name: video.snippet.title,
        artist: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
        duration: duration,
        duration_string: formatDuration(duration),
        views: video.statistics?.viewCount || 0,
        url: `https://www.youtube.com/watch?v=${video.id}`,
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('YouTube search error:', error.message);
    return [];
  }
}

function parseDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match?.[1] || 0);
  const minutes = parseInt(match?.[2] || 0);
  const seconds = parseInt(match?.[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ── Call Groq API directly (NO SDK) ──
export async function callGroqAPI(messages) {
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY is missing!');
    throw new Error('GROQ_API_KEY is not configured. Please add it to server/.env');
  }

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.8,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data;
  } catch (error) {
    console.error('Groq API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Groq API request failed');
  }
}

// ── Generate AI Playlist ──
export const generatePlaylist = async (req, res) => {
  try {
    const { prompt, count = 10, title } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Call Groq API directly
    const completion = await callGroqAPI([
      {
        role: 'system',
        content: `You are an expert music curator. Generate exactly ${count} songs that perfectly match the user's prompt.
You must return ONLY a valid JSON array of objects, each with exactly two string properties: "title" and "artist".
Do not wrap the JSON in markdown code blocks. Output raw JSON only.`
      },
      {
        role: 'user',
        content: `Generate ${count} songs for this vibe/mood: "${prompt}"`
      }
    ]);

    const rawText = completion.choices[0]?.message?.content || '';

    let aiSongs = [];
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        aiSongs = parsed;
      } else {
        const firstArray = Object.values(parsed).find(v => Array.isArray(v));
        if (firstArray) aiSongs = firstArray;
        else throw new Error('No array found');
      }
    } catch (e) {
      console.error('Failed to parse Groq response:', rawText);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Map AI songs to YouTube
    const playlistSongs = [];
    for (const aiSong of aiSongs) {
      try {
        const query = `${aiSong.title} ${aiSong.artist} official audio`;
        const searchResults = await searchYouTube(query, 1);
        if (searchResults && searchResults.length > 0) {
          playlistSongs.push({
            ...searchResults[0],
            aiGenerated: true,
          });
        }
      } catch (err) {
        console.warn(`Failed to fetch: ${aiSong.title}`);
      }
    }

    if (playlistSongs.length === 0) {
      try {
        const trending = await searchYouTube('top hits', 10);
        playlistSongs.push(...trending.slice(0, count));
      } catch (err) {
        return res.status(500).json({ 
          error: 'Failed to find any playable songs' 
        });
      }
    }

    const playlistName = title || `AI Playlist: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`;
    
    res.status(201).json({
      success: true,
      playlist: {
        id: Date.now().toString(),
        title: playlistName,
        description: `Generated by AI. Prompt: "${prompt}"`,
        coverImage: playlistSongs[0]?.thumbnail || '',
        songs: playlistSongs,
        totalSongs: playlistSongs.length,
        source: 'ai',
        prompt: prompt,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating smart playlist:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ── Autoplay Recommendations ──
export const getAutoplayRecommendations = async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required for autoplay context' });
    }

    const completion = await callGroqAPI([
      {
        role: 'system',
        content: `You are a music recommendation engine.
Return ONLY a valid JSON array of exactly 5 songs similar to the requested track.
Each object must have exactly two string properties: "title" and "artist".
Do not wrap the JSON in markdown code blocks. Output raw JSON array only.`
      },
      {
        role: 'user',
        content: `Recommend 5 songs similar to "${title}" by "${artist || 'Unknown Artist'}".`
      }
    ]);

    const rawText = completion.choices[0]?.message?.content || '';

    let aiSongs = [];
    try {
      const cleaned = rawText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      aiSongs = JSON.parse(cleaned);
      if (!Array.isArray(aiSongs)) throw new Error('Not an array');
    } catch (e) {
      console.error('Failed to parse Groq autoplay response:', rawText);
      return res.status(500).json({ error: 'Failed to parse recommendations' });
    }

    const resolvedSongs = [];
    for (const aiSong of aiSongs) {
      try {
        const query = `${aiSong.title} ${aiSong.artist} official audio`;
        const searchResults = await searchYouTube(query, 1);
        if (searchResults && searchResults.length > 0) {
          resolvedSongs.push(searchResults[0]);
        }
      } catch (err) {
        console.warn(`Autoplay YouTube resolution failed for ${aiSong.title}`);
      }
    }

    res.status(200).json({
      success: true,
      songs: resolvedSongs,
      source: 'ai'
    });
  } catch (error) {
    console.error('Error generating autoplay recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

// ── Get Lyrics ──
export const getLyrics = async (req, res) => {
  try {
    const title = req.body?.title ?? req.query?.title;
    const artist = req.body?.artist ?? req.query?.artist;

    if (!title) {
      return res.status(200).json({
        success: true,
        lyrics: 'Lyrics not available for this track.',
        title: 'Unknown',
        artist: 'Unknown',
        source: 'fallback',
        message: 'Title parameter is required.'
      });
    }

    console.log('🎵 [AI Lyrics] Fetching lyrics for:', title, 'by', artist || 'Unknown');

    try {
      const completion = await callGroqAPI([
        {
          role: 'system',
          content: `You are a lyrics database. Return ONLY the clean text lyrics of the song requested.
Do not add introductions, explanations, headings, metadata, credits, or markdown. Just the raw lyrics text with line breaks.`
        },
        {
          role: 'user',
          content: `Provide the full lyrics for "${title}" by "${artist || 'Unknown Artist'}".`
        }
      ]);

      const lyrics = completion.choices?.[0]?.message?.content?.trim() || '';

      if (!lyrics) {
        throw new Error('Empty lyrics response');
      }

      console.log('✅ [AI Lyrics] Successfully fetched lyrics via Groq');
      return res.status(200).json({ success: true, lyrics, title, artist, source: 'groq' });
    } catch (groqError) {
      console.warn('⚠️ [AI Lyrics] Groq API failed:', groqError.message);
      return res.status(200).json({
        success: true,
        lyrics: `Lyrics for "${title}" by "${artist || 'Unknown Artist'}" are not currently available.`,
        title,
        artist,
        source: 'fallback',
        message: 'Lyrics database temporarily unavailable. Please try again later.'
      });
    }
  } catch (error) {
    console.error('❌ Error in getLyrics:', error);
    return res.status(200).json({
      success: true,
      lyrics: 'Lyrics not available for this track.',
      title: req.body?.title ?? req.query?.title ?? 'Unknown',
      artist: req.body?.artist ?? req.query?.artist ?? 'Unknown',
      source: 'fallback',
      message: 'An error occurred while fetching lyrics.'
    });
  }
};