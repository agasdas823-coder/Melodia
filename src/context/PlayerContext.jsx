import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { AudioBridge } from '../utils/AudioBridge';


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
  const [usingFallback, setUsingFallback] = useState(false); // true = HTML5 audio preview
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsCache, setLyricsCache] = useState({});
  const [isShuffled, setIsShuffled] = useState(false);
  const [isLooped, setIsLooped] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  const { user } = useAuth();
  
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  // Load from local storage when user changes
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

  // Save to local storage when state changes
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

  // Watch currentTrack and push to recentTracks
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

  // (Initialization logic is now handled in the user useEffect above)

  const createPlaylist = useCallback((name, description = "", coverImageUrl = "", initialSongs = [], createdBy = "") => {
    // Resolve creator name from localStorage user if not provided
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
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name: name || `Playlist #${playlists.length + 1}`,
      description: description || "My custom collection",
      coverImageUrl: coverImageUrl || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
      songs: initialSongs,
      createdBy: creator,
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

  const addToQueue = useCallback((song) => {
    setQueue((prev) => {
      // If song already exists, don't add
      if (prev.some((s) => s.id === song.id || s._id === song._id)) return prev;
      return [...prev, song];
    });
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

  const bridgeRef = useRef(null);

  // Initialize playerReady to true since howler loads immediately
  useEffect(() => {
    setPlayerReady(true);
  }, []);

  // Initialize AudioBridge with callbacks to sync with state
  const getBridge = useCallback(() => {
    if (!bridgeRef.current) {
      bridgeRef.current = new AudioBridge({
        volume,
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
        onEnd: () => handleNext(),
        onProgress: (currentTime) => setProgress(currentTime),
        onLoad: (durationSecs) => setDuration(durationSecs),
      });
    }
    return bridgeRef.current;
  }, [volume]);

  const prefetchTrack = useCallback((track) => {
    if (!track || !track.id) return;
    const bridge = getBridge();
    bridge.prefetch(track);

    if (!lyricsCache[track.id]) {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/lyrics?title=${encodeURIComponent(track.title || track.name)}&artist=${encodeURIComponent(track.artist || track.artists?.[0]?.name)}`)
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
  }, [getBridge, lyricsCache]);


  // Sync volume with AudioBridge
  useEffect(() => {
    if (bridgeRef.current) {
      bridgeRef.current.setVolume(volume);
    }
  }, [volume]);

  // Clean up AudioBridge on unmount
  useEffect(() => {
    return () => {
      if (bridgeRef.current) {
        bridgeRef.current.unload();
      }
    };
  }, []);

  // LoadTrack: sets the track in the player without playing it (for previews)
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
    const bridge = getBridge();
    bridge.load(track);
  }, [getBridge]);

  // PlayTrack implementation using AudioBridge
  const playTrack = useCallback((track, newQueue = []) => {
    let targetQueue = queue;
    let targetIndex = 0;

    if (newQueue.length > 0) {
      targetQueue = newQueue;
      targetIndex = newQueue.findIndex((t) => t.id === track.id || t._id === track._id);
      if (targetIndex < 0) targetIndex = 0;
      setQueue(newQueue);
    } else {
      const idx = queue.findIndex((t) => t.id === track.id || t._id === track._id);
      if (idx >= 0) {
        targetIndex = idx;
      } else {
        targetQueue = [track];
        targetIndex = 0;
        setQueue([track]);
      }
    }

    setCurrentIndex(targetIndex);
    setCurrentTrack(track);
    setProgress(0);
    setDuration(track.duration || 0);
    setIsPlaying(true);

    const bridge = getBridge();
    bridge.play(track);
  }, [queue, getBridge]);

  const togglePlay = useCallback(() => {
    if (!currentTrack && queue.length > 0) {
      playTrack(queue[0]);
      return;
    }
    const bridge = getBridge();
    if (isPlaying) {
      bridge.pause();
    } else {
      if (currentTrack) {
        bridge.play(currentTrack);
      }
    }
  }, [currentTrack, isPlaying, queue, playTrack, getBridge]);

  const handleNext = useCallback(() => {
    setQueue((q) => {
      setCurrentIndex((ci) => {
        if (q.length === 0) return -1;
        
        let nextIdx;
        if (isLooped) {
          nextIdx = ci; // loop current track
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
          
          const bridge = getBridge();
          bridge.play(next);
        }
        return nextIdx;
      });
      return q;
    });
  }, [getBridge, isLooped, isShuffled]);

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

          const bridge = getBridge();
          bridge.play(prev);
        }
        return prevIdx;
      });
      return q;
    });
  }, [progress, getBridge]);

  const seek = useCallback((time) => {
    const bridge = getBridge();
    bridge.seek(time);
    setProgress(time);
  }, [getBridge]);

  const setVolume = useCallback((vol) => {
    setVolumeState(vol);
    if (vol > 0) {
      setMutedState(false);
      setPrevVolume(vol);
    } else {
      setMutedState(true);
    }
    const bridge = getBridge();
    bridge.setVolume(vol);
  }, [getBridge]);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMutedState(false);
      const restoreVol = prevVolume > 0 ? prevVolume : 0.7;
      setVolumeState(restoreVol);
      const bridge = getBridge();
      bridge.setVolume(restoreVol);
    } else {
      setMutedState(true);
      setPrevVolume(volume);
      setVolumeState(0);
      const bridge = getBridge();
      bridge.setVolume(0);
    }
  }, [muted, prevVolume, volume, getBridge]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        progress,
        duration,
        volume,
        queue,
        playerReady,
        usingFallback,
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
