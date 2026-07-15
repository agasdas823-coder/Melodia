// src/context/PlayerContext.jsx
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

import { musicService } from '../services/apiService';
import { API_URL } from '../utils/config';
import { buildSpotifyTrackQueries, getSpotifySearchCacheKey as getSpotifySearchCacheKeyForTrack, pickBestSpotifyResult } from '../utils/spotifyPlayback';
import { WebPlaybackSDK, useSpotifyPlayer, useWebPlaybackSDKReady } from 'react-spotify-web-playback-sdk';

function SpotifySDKListener({
  setSpotifyDeviceId,
  setSpotifyPlayerInstance,
  setSpotifySDKReady,
  setProgress,
  setDuration,
  setIsPlaying,
}) {
  const spotifyPlayer = useSpotifyPlayer();
  const spotifyReady = useWebPlaybackSDKReady();

  useEffect(() => {
    setSpotifySDKReady(spotifyReady);
    if (spotifyReady) {
      console.log('[Spotify] Web Playback SDK is ready');
    }
  }, [spotifyReady, setSpotifySDKReady]);

  useEffect(() => {
    if (!spotifyPlayer) return;

    const handleReady = ({ device_id }) => {
      console.log('[Spotify] Ready event fired with Device ID', device_id);
      setSpotifyDeviceId(device_id);
      setSpotifyPlayerInstance(spotifyPlayer);
    };

    const handleNotReady = ({ device_id }) => {
      console.log('[Spotify] Device went offline', device_id);
      setSpotifyDeviceId((currentId) => (currentId === device_id ? null : currentId));
      setSpotifyPlayerInstance((currentInstance) => (currentInstance === spotifyPlayer ? null : currentInstance));
    };

    const handleStateChange = (state) => {
      if (!state) return;
      setProgress(Math.floor(state.position / 1000));
      setDuration(Math.floor(state.duration / 1000));
      setIsPlaying(!state.paused);
    };

    spotifyPlayer.addListener('ready', handleReady);
    spotifyPlayer.addListener('not_ready', handleNotReady);
    spotifyPlayer.addListener('player_state_changed', handleStateChange);

    return () => {
      if (spotifyPlayer.removeListener) {
        spotifyPlayer.removeListener('ready', handleReady);
        spotifyPlayer.removeListener('not_ready', handleNotReady);
        spotifyPlayer.removeListener('player_state_changed', handleStateChange);
      }
    };
  }, [spotifyPlayer, setSpotifyDeviceId, setSpotifyPlayerInstance, setProgress, setDuration, setIsPlaying]);

  return null;
}

const PlayerContext = createContext();

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem("melodia_volume");
      return saved !== null ? parseFloat(saved) : 0.7;
    } catch {
      return 0.7;
    }
  });
  const [muted, setMutedState] = useState(() => {
    try {
      return localStorage.getItem("melodia_muted") === "true";
    } catch {
      return false;
    }
  });
  const [prevVolume, setPrevVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("melodia_prevVolume");
      return saved !== null ? parseFloat(saved) : 0.7;
    } catch {
      return 0.7;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("melodia_volume", volume.toString());
      localStorage.setItem("melodia_muted", muted.toString());
      localStorage.setItem("melodia_prevVolume", prevVolume.toString());
    } catch {}
  }, [volume, muted, prevVolume]);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playerReady, setPlayerReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsCache, setLyricsCache] = useState({});
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLooped, setIsLooped] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [previewTrack, setPreviewTrack] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(() => {
    try {
      return localStorage.getItem('spotify_access_token') || null;
    } catch {
      return null;
    }
  });
  const [spotifyRefreshToken, setSpotifyRefreshToken] = useState(() => {
    try {
      return localStorage.getItem('spotify_refresh_token') || null;
    } catch {
      return null;
    }
  });
  const [spotifyTokenExpiry, setSpotifyTokenExpiry] = useState(() => {
    try {
      const saved = localStorage.getItem('spotify_token_expiry');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [spotifyDeviceId, setSpotifyDeviceId] = useState(null);
  const [spotifySDKReady, setSpotifySDKReady] = useState(false);

  const buildSpotifyQueries = (track) => buildSpotifyTrackQueries(track);
  const getSpotifySearchCacheKey = (track) => getSpotifySearchCacheKeyForTrack(track);

  const { user } = useAuth();
  
  const queueRef = useRef(queue);
  const currentIndexRef = useRef(currentIndex);
  const durationRef = useRef(duration);
  const prefetchTriggeredRef = useRef(false);
  const currentTrackRef = useRef(null);
  const retriedTracksRef = useRef({});
  const audioRef = useRef(null);
  const lastProgressUpdateRef = useRef(Date.now());
  const spotifyProgressIntervalRef = useRef(null);
  const handleNextRef = useRef(null);
  const spotifySearchCacheRef = useRef(new Map());
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const [spotifyPlayerInstance, setSpotifyPlayerInstance] = useState(null);
  const playTrackRef = useRef(null);
  const spotifyDeviceIdRef = useRef(null);
  const spotifyPlayerInstanceRef = useRef(null);
  const spotifySDKReadyRef = useRef(false);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { 
    currentIndexRef.current = currentIndex; 
    prefetchTriggeredRef.current = false; 
  }, [currentIndex]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { spotifyDeviceIdRef.current = spotifyDeviceId; }, [spotifyDeviceId]);
  useEffect(() => { spotifyPlayerInstanceRef.current = spotifyPlayerInstance; }, [spotifyPlayerInstance]);
  useEffect(() => { spotifySDKReadyRef.current = spotifySDKReady; }, [spotifySDKReady]);

  useEffect(() => {
    if (!nowPlayingOpen) setPreviewTrack(null);
  }, [nowPlayingOpen]);

  // Initialize Spotify authorization and user playback SDK.
  const refreshSpotifyToken = useCallback(async (refreshToken) => {
    try {
      const res = await musicService.spotifyRefresh(refreshToken);
      if (res?.data?.success && res.data.data?.access_token) {
        const token = res.data.data.access_token;
        const expiresIn = Number(res.data.data.expires_in) || 0;
        const expiry = expiresIn ? Date.now() + expiresIn * 1000 : null;

        setSpotifyToken(token);
        setSpotifyTokenExpiry(expiry);
        localStorage.setItem('spotify_access_token', token);
        if (expiry) localStorage.setItem('spotify_token_expiry', expiry.toString());
        return { token, expiry };
      }
    } catch (err) {
      console.warn('[PlayerContext] Spotify refresh failed:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;
    let refreshTimer = null;

    async function fetchTokenUser() {
      try {
        const res = await fetch(`${API_URL}/api/spotify/token-user`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.success && data.access_token) {
          const expiresIn = Number(data.expires_in) || 0;
          const expiry = expiresIn ? Date.now() + expiresIn * 1000 : null;
          return { token: data.access_token, expiry };
        }
      } catch (err) {
        console.warn('[PlayerContext] token-user fetch failed:', err);
      }
      return null;
    }

    async function initSpotify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('spotify_access_token');
        const urlRefresh = params.get('spotify_refresh_token');
        const urlExpiresIn = Number(params.get('expires_in')) || 0;
        const urlExpiry = urlExpiresIn ? Date.now() + urlExpiresIn * 1000 : null;

        let token = urlToken || spotifyToken;
        let refreshToken = urlRefresh || spotifyRefreshToken;
        let expiry = urlExpiry || spotifyTokenExpiry;

        if (urlToken) {
          localStorage.setItem('spotify_access_token', urlToken);
          setSpotifyToken(urlToken);
          token = urlToken;
        }
        if (urlRefresh) {
          localStorage.setItem('spotify_refresh_token', urlRefresh);
          setSpotifyRefreshToken(urlRefresh);
          refreshToken = urlRefresh;
        }
        if (urlExpiry) {
          localStorage.setItem('spotify_token_expiry', urlExpiry.toString());
          setSpotifyTokenExpiry(urlExpiry);
          expiry = urlExpiry;
        }

        if (urlToken || urlRefresh) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('spotify_access_token');
          cleanUrl.searchParams.delete('spotify_refresh_token');
          cleanUrl.searchParams.delete('expires_in');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
        }

        const tokenExpired = expiry && Date.now() >= expiry - 60 * 1000;
        if (refreshToken && (tokenExpired || !token)) {
          const refreshed = await refreshSpotifyToken(refreshToken);
          if (refreshed) {
            token = refreshed.token;
            expiry = refreshed.expiry;
          }
        }

        if (!token && !refreshToken) {
          const tokenUser = await fetchTokenUser();
          if (tokenUser) {
            token = tokenUser.token;
            expiry = tokenUser.expiry;
          }
        }

        if (mounted && token) {
          setSpotifyToken(token);
          if (expiry) {
            setSpotifyTokenExpiry(expiry);
            localStorage.setItem('spotify_token_expiry', expiry.toString());
          }
        }

        if (expiry && expiry > Date.now()) {
          const ms = expiry - Date.now() - 60 * 1000;
          if (ms > 0 && refreshToken) {
            refreshTimer = setTimeout(() => {
              refreshSpotifyToken(refreshToken);
            }, ms);
          }
        }
      } catch (err) {
        console.warn('[PlayerContext] Spotify initialization failed:', err);
      }
    }

    initSpotify();
    return () => { mounted = false; if (refreshTimer) clearTimeout(refreshTimer); };
  }, [spotifyRefreshToken, spotifyToken, spotifyTokenExpiry, refreshSpotifyToken]);

  const getOAuthToken = useCallback(
    (cb) => {
      if (spotifyToken) {
        cb(spotifyToken);
      }
    },
    [spotifyToken]
  );

  const ensureSpotifyAccessToken = useCallback(async () => {
    if (spotifyToken && (!spotifyTokenExpiry || spotifyTokenExpiry > Date.now() + 60_000)) {
      return spotifyToken;
    }

    try {
      if (spotifyRefreshToken) {
        const refreshed = await refreshSpotifyToken(spotifyRefreshToken);
        if (refreshed?.token) {
          return refreshed.token;
        }
      }

      const res = await fetch(`${API_URL}/api/spotify/token-user`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.success && data.access_token) {
        const expiry = Number(data.expires_in) || 0;
        const tokenExpiry = expiry ? Date.now() + expiry * 1000 : null;
        setSpotifyToken(data.access_token);
        if (tokenExpiry) {
          setSpotifyTokenExpiry(tokenExpiry);
          localStorage.setItem('spotify_token_expiry', tokenExpiry.toString());
        }
        return data.access_token;
      }
    } catch (err) {
      console.warn('[PlayerContext] Failed to ensure Spotify access token:', err);
    }

    return spotifyToken;
  }, [refreshSpotifyToken, spotifyRefreshToken, spotifyToken, spotifyTokenExpiry]);

  const [likedSongs, setLikedSongs] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    if (!user) {
      setLikedSongs([]);
      setRecentTracks([]);
      setPlaylists([]);
      return;
    }
    
    const userId = user.id || user._id || user.username;
    
    try {
      const storedLiked = localStorage.getItem(`likedSongs_${userId}`);
      if (storedLiked) setLikedSongs(JSON.parse(storedLiked));
      else setLikedSongs([]);

      const storedRecent = localStorage.getItem(`recentTracks_${userId}`);
      if (storedRecent) setRecentTracks(JSON.parse(storedRecent));
      else setRecentTracks([]);

      const storedPlaylists = localStorage.getItem(`playlists_${userId}`);
      if (storedPlaylists) {
        const parsed = JSON.parse(storedPlaylists);
        setPlaylists(parsed.filter(pl => !["mj-playlist", "weeknd-playlist", "billie-playlist"].includes(pl.id)));
      } else {
        setPlaylists([]);
      }
    } catch (e) {
      console.error("Error loading user data", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const userId = user.id || user._id || user.username;
      localStorage.setItem(`likedSongs_${userId}`, JSON.stringify(likedSongs));
    }
  }, [likedSongs, user]);

  useEffect(() => {
    if (user) {
      const userId = user.id || user._id || user.username;
      localStorage.setItem(`recentTracks_${userId}`, JSON.stringify(recentTracks));
    }
  }, [recentTracks, user]);

  useEffect(() => {
    if (user) {
      const userId = user.id || user._id || user.username;
      localStorage.setItem(`playlists_${userId}`, JSON.stringify(playlists));
    }
  }, [playlists, user]);

  useEffect(() => {
    if (currentTrack) {
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== currentTrack.id && t._id !== currentTrack._id);
        return [currentTrack, ...filtered].slice(0, 30);
      });
    }
  }, [currentTrack]);

  const toggleLike = useCallback((track) => {
    if (!track) return;
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === track.id || s._id === track._id);
      if (exists) {
        return prev.filter((s) => s.id !== track.id && s._id !== track._id);
      } else {
        return [...prev, track];
      }
    });
  }, []);

  const isLiked = useCallback((track) => {
    if (!track) return false;
    const trackId = track.id || track._id;
    return likedSongs.some((s) => s.id === trackId || s._id === trackId);
  }, [likedSongs]);

  const createPlaylist = useCallback((name, description = "", coverImageUrl = "", initialSongs = [], createdBy = "", isPrivate = true, shareUrl = "") => {
    let creator = createdBy;
    if (!creator) {
      try {
        const storedUser = localStorage.getItem("melodia_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          creator = parsed.username || parsed.email || "You";
        } else {
          creator = "You";
        }
      } catch (_) {
        creator = "You";
      }
    }

    const playlistId = `pl-${Date.now()}`;
    const baseUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:5174';
    const newPlaylist = {
      id: playlistId,
      name: name || `Playlist #${playlists.length + 1}`,
      description: description || "My custom collection",
      coverImageUrl: coverImageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      songs: initialSongs,
      createdBy: creator,
      isAiGenerated: initialSongs.some(s => s.source === 'ai-generated') || false,
      isPrivate,
      shareUrl: shareUrl || `${baseUrl}/shared-playlist/${playlistId}`,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    return newPlaylist;
  }, [playlists.length]);

  const addSongToPlaylist = useCallback((playlistId, song) => {
    if (!song) return;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          const exists = pl.songs.some((s) => s.id === song.id || s._id === song._id);
          if (exists) return pl;
          const cover = pl.songs.length === 0 ? (song.coverArtUrl || pl.coverImageUrl) : pl.coverImageUrl;
          return {
            ...pl,
            coverImageUrl: cover,
            songs: [...pl.songs, song],
          };
        }
        return pl;
      })
    );
  }, []);

  const removeSongFromPlaylist = useCallback((playlistId, songId) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            songs: pl.songs.filter((s) => s.id !== songId && s._id !== songId),
          };
        }
        return pl;
      })
    );
  }, []);

  const renamePlaylist = useCallback((playlistId, newName) => {
    setPlaylists((prev) =>
      prev.map((pl) => (pl.id === playlistId ? { ...pl, name: newName } : pl))
    );
  }, []);

  const deletePlaylist = useCallback((playlistId) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooped((prev) => !prev);
  }, []);

  const clearRecents = useCallback(() => {
    setRecentTracks([]);
  }, []);

  const handleNext = useCallback(() => {
    setQueue((q) => {
      setCurrentIndex((ci) => {
        if (q.length === 0) return -1;

        let nextIdx;
        if (isLooped) {
          nextIdx = ci;
        } else if (isShuffled) {
          nextIdx = Math.floor(Math.random() * q.length);
        } else {
          nextIdx = (ci + 1) % q.length;
        }

        if (q[nextIdx]) {
          const next = q[nextIdx];
          setCurrentTrack(next);
          setProgress(0);
          setDuration(next.duration || 0);
          setActiveSource(null);
          if (playTrackRef.current) playTrackRef.current(next, q);
        }

        return nextIdx;
      });
      return q;
    });
  }, [isLooped, isShuffled]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const createAudioElement = useCallback(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volumeRef.current;
    audio.muted = mutedRef.current;

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      handleNextRef.current?.();
    });

    audio.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastProgressUpdateRef.current >= 500) {
        lastProgressUpdateRef.current = now;
        setProgress(audio.currentTime);
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration || 0);
    });

    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));

    return audio;
  }, []);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = createAudioElement();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (spotifyProgressIntervalRef.current) {
        clearInterval(spotifyProgressIntervalRef.current);
        spotifyProgressIntervalRef.current = null;
      }
    };
  }, [createAudioElement]);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
  }, [volume, muted]);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudioElement();
    }

    return audioRef.current;
  }, [createAudioElement]);

  useEffect(() => {
    setPlayerReady(true);
  }, []);

  useEffect(() => {
    if (spotifyProgressIntervalRef.current) {
      clearInterval(spotifyProgressIntervalRef.current);
      spotifyProgressIntervalRef.current = null;
    }

    if (isPlaying && activeSource === 'spotify' && !usingFallback && spotifyPlayerInstance) {
      spotifyProgressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) return prev;
          return Math.min(prev + 0.25, duration);
        });
      }, 250);
    }

    return () => {
      if (spotifyProgressIntervalRef.current) {
        clearInterval(spotifyProgressIntervalRef.current);
        spotifyProgressIntervalRef.current = null;
      }
    };
  }, [activeSource, duration, isPlaying, spotifyPlayerInstance, usingFallback]);

  const prefetchTrack = useCallback((track) => {
    if (!track || !track.id) return;

    if (!lyricsCache[track.id]) {
      fetch(`${API_URL}/api/lyrics?title=${encodeURIComponent(track.title || track.name)}&artist=${encodeURIComponent(track.artist || track.artists?.[0]?.name)}`)
        .then(res => res.json())
        .then(data => {
          if (data.lyrics) {
            setLyricsCache(prev => ({ ...prev, [track.id]: data.lyrics.trim() }));
          } else {
            setLyricsCache(prev => ({ ...prev, [track.id]: "NOT_FOUND" }));
          }
        })
        .catch(err => console.error("Prefetch lyrics error:", err));
    }
  }, [lyricsCache]);

  const addToQueue = useCallback((song) => {
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id || s._id === song._id)) return prev;
      try { prefetchTrack(song); } catch (e) {}
      return [...prev, song];
    });
  }, [prefetchTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const loadTrack = useCallback((track) => {
    if (!track) return;
    setCurrentTrack(track);
    setProgress(0);
    setDuration(track.duration || 0);
    setIsPlaying(false);
    setQueue((prev) => {
      const exists = prev.some((t) => t.id === track.id || t._id === track._id);
      if (!exists) return [track, ...prev];
      return prev;
    });
  }, []);

  const playTrack = useCallback(async (track, newQueue = []) => {
    if (!track) {
      console.error('❌ [PlayerContext] No track provided');
      return;
    }

    if (track && track.id) {
      delete retriedTracksRef.current[track.id];
    }

    let targetQueue = queue;
    let targetIndex = 0;

    if (newQueue.length > 0) {
      targetQueue = newQueue;
      targetIndex = newQueue.findIndex((t) => t.id === track.id || t._id === track.id);
      if (targetIndex < 0) targetIndex = 0;
      setQueue(newQueue);
    } else {
      const idx = queue.findIndex((t) => t.id === track.id || t._id === track.id);
      if (idx >= 0) {
        targetIndex = idx;
      } else {
        targetQueue = [track];
        targetIndex = 0;
        setQueue([track]);
      }
    }

    const audio = audioRef.current || getAudio();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }

    if (spotifyPlayerInstanceRef.current) {
      try {
        spotifyPlayerInstanceRef.current.pause?.();
      } catch (err) {
        console.warn('[PlayerContext] Pause previous Spotify playback failed:', err);
      }
    }

    setCurrentIndex(targetIndex);
    setCurrentTrack(track);
    setProgress(0);
    setDuration(track.duration || 0);
    setIsPlaying(true);
    setActiveSource(null);
    setIsResolving(false);

    const trackSource = track.source || 'spotify';
    const spotifyUri = track.spotifyUri || track.uri || (track.source === 'spotify' && track.id ? `spotify:track:${track.id}` : null);
    const activeSpotifyToken = await ensureSpotifyAccessToken();

    const tryPlaySpotifyUri = async (uri) => {
      if (!activeSpotifyToken || !uri) return false;
      try {
        const player = spotifyPlayerInstanceRef.current;
        if (player && !spotifyDeviceIdRef.current) {
          try {
            await player.connect?.();
          } catch (err) {
            console.warn('[PlayerContext] Spotify connect attempt failed:', err);
          }
        }

        if (!spotifyDeviceIdRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        if (!spotifyDeviceIdRef.current) {
          console.warn('[PlayerContext] No Spotify device ID available, skipping Spotify API play');
          return false;
        }

        const playUrl = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(spotifyDeviceIdRef.current)}`;
        const playRes = await fetch(playUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${activeSpotifyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uris: [uri] }),
        });

        if (playRes.status === 204 || playRes.ok) {
          try {
            spotifyPlayerInstanceRef.current?.resume?.();
          } catch (err) {
            console.warn('[PlayerContext] Spotify resume failed:', err);
          }
          console.log('🎵 [Spotify] Started full-track playback', uri, 'on device', spotifyDeviceIdRef.current);
          setActiveSource('spotify');
          setUsingFallback(false);
          return true;
        }

        console.warn('[PlayerContext] Spotify play call failed', playRes.status, await playRes.text().catch(() => ''));
      } catch (err) {
        console.warn('[PlayerContext] Spotify play request error:', err);
      }
      return false;
    };

    if (trackSource === 'spotify' && spotifyUri) {
      const played = await tryPlaySpotifyUri(spotifyUri);
      if (played) return;
    }

    const queries = buildSpotifyQueries(track);
    const cacheKey = getSpotifySearchCacheKey(track);

    try {
      let spotifyResult = cacheKey ? spotifySearchCacheRef.current.get(cacheKey) : null;

      if (spotifyResult) {
        console.log('[PlayerContext] Spotify search cache hit for', cacheKey);
      }

      if (!spotifyResult && queries.length) {
        const searchQuery = async (query) => {
          try {
            const spRes = await musicService.spotifySearch(query, { limit: 5 });
            const songs = spRes?.data?.songs || [];
            return { query, songs };
          } catch (err) {
            console.warn('[PlayerContext] Spotify search error for', query, err);
            return { query, songs: [] };
          }
        };

        const [bestQuery, ...fallbackQueries] = queries;
        console.log('[PlayerContext] Spotify search first try:', bestQuery);

        const firstResult = await searchQuery(bestQuery);
        if (firstResult.songs.length) {
          spotifyResult = pickBestSpotifyResult(firstResult.songs);
          if (spotifyResult) {
            console.log('[PlayerContext] Spotify search matched', spotifyResult.title || spotifyResult.name, 'via', bestQuery);
          }
        }

        if (!spotifyResult && fallbackQueries.length) {
          const fallbackPromises = fallbackQueries.map(searchQuery);
          const settled = await Promise.allSettled(fallbackPromises);
          for (const result of settled) {
            if (result.status !== 'fulfilled') continue;
            const { query, songs } = result.value;
            if (!songs.length) {
              console.warn('[PlayerContext] Spotify search returned no results for', query);
              continue;
            }
            spotifyResult = pickBestSpotifyResult(songs);
            if (spotifyResult) {
              console.log('[PlayerContext] Spotify fallback matched', spotifyResult.title || spotifyResult.name, 'via', query);
              break;
            }
          }
        }

        if (cacheKey && spotifyResult) {
          spotifySearchCacheRef.current.set(cacheKey, spotifyResult);
        }
      }

      if (spotifyResult) {
        const uri = spotifyResult.spotifyUri || spotifyResult.uri || (spotifyResult.id ? `spotify:track:${spotifyResult.id}` : null);
        const preview = spotifyResult.previewUrl || spotifyResult.preview_url || spotifyResult.audioUrl || spotifyResult.audio_url || null;

        if (uri) {
          const played = await tryPlaySpotifyUri(uri);
          if (played) return;
        }

        if (preview) {
          console.log('🎵 [Spotify] Playing preview URL', preview);
          const audio = getAudio();
          audio.pause();
          audio.src = preview;
          audio.currentTime = 0;
          audio.volume = volume;
          audio.muted = muted;
          await audio.play().catch((err) => {
            console.warn('[PlayerContext] Audio playback failed:', err);
          });
          setActiveSource('spotify');
          setUsingFallback(true);
          return;
        }
      }

      const itRes = await fetch(`${API_URL}/api/spotify/itunes/search?q=${encodeURIComponent(queries.join(' '))}&limit=1`);
      if (itRes.ok) {
        const itData = await itRes.json();
        if (itData && itData.songs && itData.songs.length > 0) {
          const found = itData.songs[0];
          const preview = found.previewUrl || found.preview_url || found.audioUrl || null;
          if (preview) {
            console.log('🎵 [iTunes] Playing preview URL', preview);
            setActiveSource('itunes');
            setUsingFallback(true);
            const audio = getAudio();
            audio.pause();
            audio.src = preview;
            audio.currentTime = 0;
            audio.volume = volume;
            audio.muted = muted;
            await audio.play().catch((err) => {
              console.warn('[PlayerContext] Audio playback failed:', err);
            });
            return;
          }
        }
      }

      console.error('❌ [PlayerContext] No playable preview found for', track.title || track.name);
      setIsPlaying(false);
      if (!retriedTracksRef.current[track.id]) {
        retriedTracksRef.current[track.id] = true;
        alert(`Sorry, couldn't play "${track.title || track.name}". No preview available.`);
      }
      return;
    } catch (err) {
      console.error('[PlayerContext] Error during playback fallback:', err);
      setIsPlaying(false);
      alert('Playback failed.');
      return;
    }
  }, [queue, getAudio, spotifyDeviceId, volume, muted, ensureSpotifyAccessToken]);

  // Keep a ref to the playTrack function so callbacks defined earlier can call it
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const togglePlay = useCallback(() => {
    if (!currentTrack && queue.length > 0) {
      playTrack(queue[0]);
      return;
    }

    if (spotifyPlayerInstance && activeSource === 'spotify' && !usingFallback) {
      if (isPlaying) {
        spotifyPlayerInstance.pause?.();
      } else {
        spotifyPlayerInstance.resume?.() ?? spotifyPlayerInstance.togglePlay?.();
      }
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch((err) => console.warn('[PlayerContext] Audio play failed:', err));
      }
    }
  }, [activeSource, currentTrack, isPlaying, queue, playTrack, spotifyPlayerInstance, usingFallback]);

  const seek = useCallback((time) => {
    if (spotifyPlayerInstance && activeSource === 'spotify' && !usingFallback) {
      spotifyPlayerInstance.seek?.(Math.round(time * 1000));
    }
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
    setProgress(time);
  }, [activeSource, spotifyPlayerInstance, usingFallback]);

  const handlePrev = useCallback(() => {
    if (progress > 3) {
      seek(0);
      return;
    }
    setQueue((q) => {
      setCurrentIndex((ci) => {
        if (q.length === 0) return -1;
        const prevIdx = (ci - 1 + q.length) % q.length;
        if (q[prevIdx]) {
          const prev = q[prevIdx];
          setCurrentTrack(prev);
          setProgress(0);
          setDuration(prev.duration || 0);
          setActiveSource(null);
          playTrack(prev, q);
        }
        return prevIdx;
      });
      return q;
    });
  }, [playTrack, progress, seek]);

  const setVolume = useCallback((vol) => {
    setVolumeState(vol);
    if (vol > 0) {
      setMutedState(false);
      setPrevVolume(vol);
    } else {
      setMutedState(true);
    }

    if (spotifyPlayerInstance && activeSource === 'spotify' && !usingFallback) {
      spotifyPlayerInstance.setVolume?.(Math.min(Math.max(vol, 0), 1));
    }

    const audio = audioRef.current;
    if (audio) {
      audio.volume = vol;
    }
  }, [activeSource, spotifyPlayerInstance, usingFallback]);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMutedState(false);
      const restoreVol = prevVolume > 0 ? prevVolume : 0.7;
      setVolumeState(restoreVol);
      if (spotifyPlayerInstance && activeSource === 'spotify' && !usingFallback) {
        spotifyPlayerInstance.setVolume?.(Math.min(Math.max(restoreVol, 0), 1));
      }
      const audio = audioRef.current;
      if (audio) {
        audio.muted = false;
        audio.volume = restoreVol;
      }
    } else {
      setMutedState(true);
      setPrevVolume(volume);
      setVolumeState(0);
      if (spotifyPlayerInstance && activeSource === 'spotify' && !usingFallback) {
        spotifyPlayerInstance.setVolume?.(0);
      }
      const audio = audioRef.current;
      if (audio) {
        audio.muted = true;
        audio.volume = 0;
      }
    }
  }, [activeSource, muted, prevVolume, spotifyPlayerInstance, usingFallback, volume]);

  const contextValue = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      progress,
      duration,
      volume,
      queue,
      playerReady,
      usingFallback,
      activeSource,
      isResolving,
      lyricsOpen,
      setLyricsOpen,
      loadTrack,
      playTrack,
      togglePlay,
      nextTrack: handleNext,
      prevTrack: handlePrev,
      seek,
      setVolume,
      muted,
      toggleMute,
      likedSongs,
      toggleLike,
      isLiked,
      recentTracks,
      clearRecents,
      playlists,
      createPlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToQueue,
      isShuffled,
      isLooped,
      toggleShuffle,
      toggleLoop,
      lyricsCache,
      prefetchTrack,
      nowPlayingOpen,
      setNowPlayingOpen,
      previewTrack,
      setPreviewTrack,
      spotifyToken,
      spotifyDeviceId,
      spotifySDKReady,
    }),
    [
      activeSource,
      addSongToPlaylist,
      addToQueue,
      clearRecents,
      createPlaylist,
      currentTrack,
      duration,
      handleNext,
      handlePrev,
      isLiked,
      isLiked,
      isLooped,
      isPlaying,
      isResolving,
      isShuffled,
      likedSongs,
      loadTrack,
      lyricsCache,
      lyricsOpen,
      nowPlayingOpen,
      playerReady,
      playTrack,
      previewTrack,
      progress,
      queue,
      seek,
      setLyricsOpen,
      setNowPlayingOpen,
      setPreviewTrack,
      setVolume,
      spotifyDeviceId,
      spotifySDKReady,
      spotifyToken,
      toggleLike,
      toggleLoop,
      togglePlay,
      toggleShuffle,
      toggleMute,
      muted,
      usingFallback,
      volume,
    ]
  );

  return (
    <PlayerContext.Provider
      value={contextValue}
    >
      {spotifyToken ? (
        <WebPlaybackSDK
          initialDeviceName="Melodia Web Player"
          getOAuthToken={getOAuthToken}
          initialVolume={volume}
          connectOnInitialized={true}
        >
          <SpotifySDKListener
            setSpotifyDeviceId={setSpotifyDeviceId}
            setSpotifyPlayerInstance={setSpotifyPlayerInstance}
            setSpotifySDKReady={setSpotifySDKReady}
            setProgress={setProgress}
            setDuration={setDuration}
            setIsPlaying={setIsPlaying}
          />
          {children}
        </WebPlaybackSDK>
      ) : (
        children
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
} 