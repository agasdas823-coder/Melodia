import axios from 'axios';
import { API_URL } from '../utils/config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[apiService] Unauthorized request');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (payload) => api.post('/api/auth/register', payload),
  login: (payload) => api.post('/api/auth/login', payload),
};

export const musicService = {
  search: (q, params = {}) => api.get('/api/search', { params: { q, ...params } }),
  getTrack: (id) => api.get(`/api/track/${id}`),
  getPlaylist: (id) => api.get(`/api/playlist/${id}`),
  resolve: (title, artist) => api.get('/api/resolve', { params: { title, artist } }),
  // Spotify-specific helper endpoints
  spotifySearch: (q, params = {}) => api.get('/api/spotify/search', { params: { q, ...params } }),
  spotifyGetTrack: (id) => api.get(`/api/spotify/track/${id}`),
  spotifyAuthorize: () => api.get('/api/spotify/auth'),
  spotifyRefresh: (refreshToken) => api.post('/api/spotify/refresh', { refresh_token: refreshToken }),
};

export const playlistService = {
  create: (payload) => api.post('/api/playlists', payload),
  addSong: (id, song) => api.post(`/api/playlist/${id}/add`, { song }),
  removeSong: (id, songId) => api.post(`/api/playlist/${id}/remove`, { songId }),
};

export const createPlaylist = (payload) => api.post('/api/playlists', payload);

export const aiService = {
  generate: (payload) => api.post('/api/ai/generate', payload),
};

export const likedService = {
  add: (payload) => api.post('/api/liked/add', payload),
  remove: (payload) => api.post('/api/liked/remove', payload),
  get: () => api.get('/api/liked/get'),
};

export const lyricsService = {
  getLyrics: (title, artist) => api.get('/api/lyrics', { params: { title, artist } }),
};

export default api;
