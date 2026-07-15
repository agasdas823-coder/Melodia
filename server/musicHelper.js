// server/musicHelper.js
import * as youtubeApi from '../lib/youtubeApi.js';
import * as itunes from './spotify.js';
import * as spotify from './services/spotifyService.js';
import axios from 'axios';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600 });

/**
 * Unified music helper - tries YouTube first, then falls back
 */
class MusicHelper {
  constructor() {
    this.sources = {
      youtube: {
        name: 'YouTube',
        priority: 1,
        enabled: youtubeApi.isYouTubeConfigured(),
        search: this.searchYouTube.bind(this),
        getTrack: this.getYouTubeTrack.bind(this),
        getPlaylist: this.getYouTubePlaylist.bind(this),
        stream: this.streamYouTube.bind(this),
      },
      spotify: {
        name: 'Spotify',
        priority: 2,
        enabled: !!process.env.SPOTIFY_CLIENT_ID,
        search: this.searchSpotify.bind(this),
        getTrack: this.getSpotifyTrack.bind(this),
        getPlaylist: this.getSpotifyPlaylist.bind(this),
        stream: this.streamSpotify.bind(this),
      },
      itunes: {
        name: 'iTunes',
        priority: 3,
        enabled: true,
        search: this.searchITunes.bind(this),
        getTrack: this.getITunesTrack.bind(this),
        stream: this.streamITunes.bind(this),
      }
    };
  }

  // ── YouTube Methods ──
  async searchYouTube(query, limit = 20) {
    try {
      if (!this.sources.youtube.enabled) throw new Error('YouTube not configured');
      const results = await youtubeApi.searchVideos(query, limit);
      return results.map(r => ({
        ...r,
        source: 'youtube',
        hasFullAudio: true,
        hasPreview: true,
      }));
    } catch (error) {
      console.warn('YouTube search failed:', error.message);
      return null;
    }
  }

  async getYouTubeTrack(id) {
    try {
      if (!this.sources.youtube.enabled) return null;
      const track = await youtubeApi.getVideo(id);
      if (!track) return null;
      return {
        ...track,
        source: 'youtube',
        hasFullAudio: true,
        hasPreview: true,
      };
    } catch (error) {
      console.warn('YouTube track fetch failed:', error.message);
      return null;
    }
  }

  async getYouTubePlaylist(id) {
    try {
      if (!this.sources.youtube.enabled) return null;
      return await youtubeApi.getPlaylist(id);
    } catch (error) {
      console.warn('YouTube playlist fetch failed:', error.message);
      return null;
    }
  }

  async streamYouTube(videoId) {
    try {
      // Your existing streaming logic
      const response = await axios.get(`http://localhost:${process.env.PORT || 5002}/api/stream-direct/${videoId}`);
      return response.data;
    } catch (error) {
      console.warn('YouTube streaming failed:', error.message);
      return null;
    }
  }

  // ── Spotify Methods ──
  async searchSpotify(query, limit = 20) {
    try {
      if (!this.sources.spotify.enabled) throw new Error('Spotify not enabled');
      const results = await spotify.searchTracks(query, limit);
      return results.map(r => ({
        ...r,
        source: 'spotify',
        hasFullAudio: false,
        hasPreview: !!r.previewUrl,
        previewUrl: r.previewUrl,
      }));
    } catch (error) {
      console.warn('Spotify search failed:', error.message);
      return null;
    }
  }

  async getSpotifyTrack(id) {
    try {
      if (!this.sources.spotify.enabled) return null;
      const track = await spotify.getTrack(id);
      if (!track) return null;
      return {
        ...track,
        source: 'spotify',
        hasFullAudio: false,
        hasPreview: !!track.previewUrl,
        previewUrl: track.previewUrl,
      };
    } catch (error) {
      console.warn('Spotify track fetch failed:', error.message);
      return null;
    }
  }

  async getSpotifyPlaylist(id) {
    try {
      if (!this.sources.spotify.enabled) return null;
      return await spotify.getPlaylist(id);
    } catch (error) {
      console.warn('Spotify playlist fetch failed:', error.message);
      return null;
    }
  }

  async streamSpotify(previewUrl) {
    if (!previewUrl) return null;
    return { url: previewUrl, isPreview: true };
  }

  // ── iTunes Methods ──
  async searchITunes(query, limit = 20) {
    try {
      const results = await itunes.searchTracksITunes(query, limit);
      return results.map(r => ({
        ...r,
        source: 'itunes',
        hasFullAudio: false,
        hasPreview: !!r.previewUrl,
        previewUrl: r.previewUrl,
      }));
    } catch (error) {
      console.warn('iTunes search failed:', error.message);
      return null;
    }
  }

  async getITunesTrack(id) {
    try {
      const response = await axios.get(`https://itunes.apple.com/lookup?id=${id}`);
      if (!response.data.results || response.data.results.length === 0) return null;
      
      const track = response.data.results[0];
      return {
        id: track.trackId.toString(),
        _id: track.trackId.toString(),
        title: track.trackName,
        name: track.trackName,
        artist: track.artistName,
        artists: [{ name: track.artistName }],
        album: track.collectionName || 'Single',
        thumbnail: track.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        thumbnail_medium: track.artworkUrl100 || '',
        coverArtUrl: track.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        duration: Math.floor(track.trackTimeMillis / 1000),
        duration_ms: track.trackTimeMillis,
        duration_string: this.formatDuration(track.trackTimeMillis),
        previewUrl: track.previewUrl,
        url: track.trackViewUrl,
        type: 'song',
        source: 'itunes',
        hasFullAudio: false,
        hasPreview: !!track.previewUrl,
      };
    } catch (error) {
      console.warn('iTunes track fetch failed:', error.message);
      return null;
    }
  }

  async streamITunes(previewUrl) {
    if (!previewUrl) return null;
    return { url: previewUrl, isPreview: true };
  }

  // ── Unified Methods ──
  async search(query, limit = 20) {
    const cacheKey = `search:${query}:${limit}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // Try YouTube first
    let results = await this.searchYouTube(query, limit);
    let source = 'youtube';

    // If YouTube fails, try Spotify
    if (!results || results.length === 0) {
      results = await this.searchSpotify(query, limit);
      source = 'spotify';
    }

    // If Spotify fails, try iTunes
    if (!results || results.length === 0) {
      results = await this.searchITunes(query, limit);
      source = 'itunes';
    }

    const response = {
      source: source,
      count: results?.length || 0,
      songs: results || [],
    };

    cache.set(cacheKey, response);
    return response;
  }

  async getTrack(id) {
    const cacheKey = `track:${id}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // Try YouTube first
    let track = await this.getYouTubeTrack(id);
    let source = 'youtube';

    // If YouTube fails, try Spotify
    if (!track) {
      track = await this.getSpotifyTrack(id);
      source = 'spotify';
    }

    // If Spotify fails, try iTunes
    if (!track) {
      track = await this.getITunesTrack(id);
      source = 'itunes';
    }

    if (track) {
      track.primarySource = source;
      cache.set(cacheKey, track);
    }

    return track;
  }

  async getPlaylist(id) {
    const cacheKey = `playlist:${id}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    // Try YouTube first
    let playlist = await this.getYouTubePlaylist(id);
    let source = 'youtube';

    // If YouTube fails, try Spotify
    if (!playlist) {
      playlist = await this.getSpotifyPlaylist(id);
      source = 'spotify';
    }

    if (playlist) {
      playlist.source = source;
      cache.set(cacheKey, playlist);
    }

    return playlist;
  }

  async stream(id, type = 'full') {
    // Try YouTube for full audio
    if (type === 'full') {
      const stream = await this.streamYouTube(id);
      if (stream) {
        return { ...stream, source: 'youtube', type: 'full' };
      }
    }

    // Fallback to preview
    const track = await this.getTrack(id);
    if (track && track.previewUrl) {
      return { 
        url: track.previewUrl, 
        source: track.source, 
        type: 'preview',
        isPreview: true 
      };
    }

    return null;
  }

  formatDuration(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

export default new MusicHelper();