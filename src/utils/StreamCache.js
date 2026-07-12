// StreamCache.js - localStorage cache for resolved stream URLs with 24-hour TTL

const CACHE_PREFIX = 'melodia_stream_cache_';
const TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const StreamCache = {
  get(videoId) {
    if (!videoId) return null;
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${videoId}`);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > TTL) {
        localStorage.removeItem(`${CACHE_PREFIX}${videoId}`);
        return null;
      }

      return parsed.url;
    } catch (e) {
      console.warn('[StreamCache] Read error:', e);
      return null;
    }
  },

  set(videoId, url) {
    if (!videoId || !url) return;
    try {
      localStorage.setItem(`${CACHE_PREFIX}${videoId}`, JSON.stringify({
        url,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('[StreamCache] Write error (storage might be full):', e);
    }
  },

  clear() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      console.log('[StreamCache] Cleared all cached streams.');
    } catch (e) {
      console.warn('[StreamCache] Clear error:', e);
    }
  }
};
