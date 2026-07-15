import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = process.env.PLAYLIST_STORAGE_PATH || path.join(__dirname, '..', 'data', 'playlists.json');

function ensureStore() {
  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, JSON.stringify([]), 'utf8');
  }
}

function readPlaylists() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
  } catch (error) {
    console.warn('Falling back to empty playlist store:', error.message);
    return [];
  }
}

function writePlaylists(playlists) {
  ensureStore();
  fs.writeFileSync(storagePath, JSON.stringify(playlists, null, 2), 'utf8');
}

function buildShareUrl(req, id) {
  const explicitFrontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL;
  if (explicitFrontendUrl) {
    const normalizedBaseUrl = explicitFrontendUrl.endsWith('/') ? explicitFrontendUrl.slice(0, -1) : explicitFrontendUrl;
    return `${normalizedBaseUrl}/shared-playlist/${id}`;
  }

  const protocol = req.get?.('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get?.('x-forwarded-host') || req.get?.('host') || 'localhost:5174';
  return `${protocol}://${host}/shared-playlist/${id}`;
}

function normalizePlaylist(payload = {}, req) {
  const id = payload.id || `pl-${Date.now()}`;
  const trimmedName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const trimmedDescription = typeof payload.description === 'string' ? payload.description.trim() : '';
  const trimmedGenre = typeof payload.genre === 'string' ? payload.genre.trim() : '';
  const trimmedCover = typeof payload.coverImage === 'string' ? payload.coverImage.trim() : '';
  const normalizedSongs = Array.isArray(payload.songs) ? payload.songs : [];

  return {
    id,
    name: trimmedName || 'Untitled Playlist',
    description: trimmedDescription,
    genre: trimmedGenre,
    coverImage: trimmedCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
    isPrivate: payload.isPrivate === true,
    createdBy: payload.createdBy || 'Unknown',
    shareUrl: payload.shareUrl || buildShareUrl(req, id),
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    songs: normalizedSongs,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

export const createPlaylist = async (req, res) => {
  try {
    const { name, description = '', genre = '', coverImage = '', isPrivate = false, tags = [], songs = [], createdBy = 'Unknown' } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Playlist name is required.' }
      });
    }

    const playlists = readPlaylists();
    const playlist = normalizePlaylist({
      id: `pl-${Date.now()}`,
      name,
      description,
      genre,
      coverImage,
      isPrivate,
      tags,
      songs,
      createdBy,
    }, req);

    playlists.push(playlist);
    writePlaylists(playlists);

    console.log(`✅ [createPlaylist] Created playlist: ${playlist.name} (${playlist.id})`);
    return res.status(201).json({
      success: true,
      playlist,
    });
  } catch (error) {
    console.error('❌ [createPlaylist] Error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create playlist' }
    });
  }
};

export const sharePlaylist = async (req, res) => {
  try {
    const payload = req.body || {};
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Playlist name is required.' }
      });
    }

    const playlists = readPlaylists();
    const existingIndex = playlists.findIndex((entry) => entry.id === payload.id);
    const playlist = normalizePlaylist({ ...payload, isPrivate: false }, req);

    if (existingIndex >= 0) {
      playlists[existingIndex] = playlist;
    } else {
      playlists.push(playlist);
    }

    writePlaylists(playlists);

    console.log(`✅ [sharePlaylist] Shared playlist: ${playlist.name} (${playlist.id})`);
    return res.status(200).json({ success: true, playlist });
  } catch (error) {
    console.error('❌ [sharePlaylist] Error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to share playlist' }
    });
  }
};

export const getPublicPlaylist = async (req, res) => {
  try {
    const { id } = req.params || {};
    if (!id) {
      return res.status(400).json({ success: false, error: { message: 'Playlist id is required.' } });
    }

    const playlists = readPlaylists();
    const playlist = playlists.find((entry) => entry.id === id);

    if (!playlist) {
      console.warn(`⚠️ [getPublicPlaylist] Playlist not found: ${id}`);
      return res.status(404).json({ success: false, error: { message: 'Playlist not found.' } });
    }

    if (playlist.isPrivate) {
      console.warn(`⚠️ [getPublicPlaylist] Playlist is private: ${id}`);
      return res.status(403).json({ success: false, error: { message: 'This playlist is private.' } });
    }

    console.log(`✅ [getPublicPlaylist] Retrieved public playlist: ${playlist.name} (${id})`);
    return res.status(200).json({ success: true, playlist });
  } catch (error) {
    console.error('❌ [getPublicPlaylist] Error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve playlist' }
    });
  }
};
