import { API_URL } from '../utils/config';

export async function getPlaylist(id, localPlaylists = []) {
  if (!id) {
    return {
      success: false,
      playlist: { id, name: 'Playlist not found', songs: [] },
      source: 'fallback',
    };
  }

  // 1. Check provided local playlists first
  const normalizedId = String(id || '').trim();
  const matchLocalPlaylist = (playlist) => {
    if (!playlist) return false;
    const playlistId = String(playlist.id || playlist._id || '').trim();
    return playlistId === normalizedId;
  };

  const localPlaylist = localPlaylists.find(matchLocalPlaylist);
  if (localPlaylist) {
    console.log('✅ Found in local playlists:', localPlaylist.name || localPlaylist.title);
    return { success: true, playlist: localPlaylist, source: 'local' };
  }

  // 1b. Load persisted local playlists from storage as fallback
  try {
    const storedUser = localStorage.getItem('melodia_user');
    let playlistFound = null;

    const searchPlaylistArray = (playlistArray) => {
      if (!Array.isArray(playlistArray)) return null;
      return playlistArray.find(matchLocalPlaylist) || null;
    };

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser?.id || parsedUser?._id || parsedUser?.username;
      if (userId) {
        const storedPlaylists = localStorage.getItem(`playlists_${userId}`);
        playlistFound = searchPlaylistArray(JSON.parse(storedPlaylists || 'null'));
      }
    }

    if (!playlistFound) {
      const playlistKeys = Object.keys(localStorage).filter((key) => key.startsWith('playlists_'));
      for (const key of playlistKeys) {
        const storedPlaylists = localStorage.getItem(key);
        const parsedPlaylists = JSON.parse(storedPlaylists || 'null');
        playlistFound = searchPlaylistArray(parsedPlaylists);
        if (playlistFound) break;
      }
    }

    if (playlistFound) {
      console.log('✅ Found in persisted playlists:', playlistFound.name || playlistFound.title);
      return { success: true, playlist: playlistFound, source: 'local' };
    }
  } catch (error) {
    console.warn('⚠️ Could not load persisted playlists from localStorage:', error.message);
  }

  // 2. Try YouTube playlist endpoint for external playlist IDs
  const isInternalId = normalizedId.startsWith('pl-');
  if (!isInternalId) {
    try {
      console.log('🔄 Trying YouTube playlist API:', id);
      const response = await fetch(`${API_URL}/api/youtube-playlist/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got YouTube playlist from API');
        return { success: true, playlist: data.playlist || data, source: 'youtube' };
      } else {
        console.warn(`⚠️ YouTube API returned status ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ YouTube playlist fetch error:', error.message);
    }
  }

  // 3. Try generic playlist endpoint for external playlist IDs
  if (!isInternalId) {
    try {
      console.log('🔄 Trying generic playlist API:', id);
      const response = await fetch(`${API_URL}/api/playlist/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Got playlist from API');
        const playlist = data.playlist || data;
        return { success: true, playlist, source: 'api' };
      } else {
        console.warn(`⚠️ Generic API returned status ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Generic playlist fetch error:', error.message);
    }
  }

  // 4. Try public playlist API for internal IDs
  if (isInternalId) {
    try {
      console.log('🔄 Trying public playlist API:', id);
      const response = await fetch(`${API_URL}/api/playlists/public/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.playlist) {
          console.log('✅ Got public playlist from API');
          return { success: true, playlist: data.playlist, source: 'public' };
        }
      }
    } catch (error) {
      console.warn('⚠️ Public playlist fetch error:', error.message);
    }
  }

  // 5. Fallback to empty playlist
  console.log('⚠️ Falling back to empty playlist');
  return {
    success: false,
    playlist: { id, name: 'Playlist not found', description: 'The playlist could not be loaded.', songs: [] },
    source: 'fallback',
  };
}
