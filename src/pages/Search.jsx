import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { musicService } from "../services/apiService";
import { Search as SearchIcon, X, Play, Pause, Music, Heart, Plus } from "lucide-react";
import AddToPlaylistDropdown from "../components/playlist/AddToPlaylistDropdown";
import { API_URL } from "../utils/config";
import { getPlaylist } from "../services/playlistService";


const POPULAR_SEARCHES = [
  "Michael Jackson",
  "The Weeknd",
  "Billie Eilish",
  "Ed Sheeran",
  "Dua Lipa",
  "Taylor Swift",
  "Drake",
  "Ariana Grande",
];

export default function Search() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLike, isLiked, createPlaylist, setNowPlayingOpen, setPreviewTrack } = usePlayer();
  const [inputValue, setInputValue] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [spotifyLookupActive, setSpotifyLookupActive] = useState(false);
  const [spotifyLookupMessage, setSpotifyLookupMessage] = useState('');
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("melodia_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const spotifyQueryCacheRef = useRef(new Map());
  const spotifyRateLimitUntilRef = useRef(0);
  const inFlightPromisesRef = useRef(new Map());
  const inputRef = useRef(null);
  const SPOTIFY_RETRY_CAP = 2;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const normalizeSpotifyQueryValue = (value) => {
    return String(value || '')
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/\s*[-–—]\s*(official|audio|video|lyric|lyrics|lyrics?)$/gi, '')
      .replace(/\b(official|audio|video|lyric|lyrics?|topic|vevo)\b/gi, '')
      .replace(/[.,/#!$%^&*;:{}=+_`~?"'\[\]]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  const normalizeSpotifyQueryKey = (title, artist) => {
    return `${normalizeSpotifyQueryValue(title).toLowerCase()}||${normalizeSpotifyQueryValue(artist).toLowerCase()}`;
  };

  const getSpotifyQueryString = (track) => {
    const title = normalizeSpotifyQueryValue(track.title || track.name);
    const artist = normalizeSpotifyQueryValue(track.artist || track.artists?.[0]?.name);
    if (!title || !artist) return null;
    return `${title} ${artist}`.trim();
  };

  const fetchSpotifyUrisForTracks = async (tracks) => {
    const queryItems = [];
    const queryToCacheKey = new Map();
    const cacheMap = new Map();

    if (Date.now() < spotifyRateLimitUntilRef.current) {
      setSpotifyLookupMessage('Spotify rate limited, using iTunes fallback.');
      return cacheMap;
    }

    for (const track of tracks) {
      if (!track || track.spotifyUri || track.source !== 'youtube') continue;
      const query = getSpotifyQueryString(track);
      if (!query) continue;
      const key = normalizeSpotifyQueryKey(track.title || track.name, track.artist || track.artists?.[0]?.name);
      if (spotifyQueryCacheRef.current.has(key)) {
        cacheMap.set(key, spotifyQueryCacheRef.current.get(key));
        continue;
      }
      if (queryItems.some((item) => item.q === query)) continue;
      queryItems.push({ q: query, limit: 1 });
      queryToCacheKey.set(query, key);
    }

    if (queryItems.length === 0) {
      return cacheMap;
    }

    setSpotifyLookupActive(true);
    setSpotifyLookupMessage('Loading Spotify results...');

    try {
      const response = await musicService.spotifyBatchSearch(queryItems, 1);
      const rateLimited = response?.data?.rateLimited;
      const results = response?.data?.results || [];
      for (const result of results) {
        const query = String(result.q || '').trim();
        if (!query) continue;
        const firstSong = result?.songs?.[0];
        const spotifyUri = firstSong?.spotifyUri || firstSong?.uri || (firstSong?.id ? `spotify:track:${firstSong.id}` : null);
        const cacheKey = queryToCacheKey.get(query);
        if (!cacheKey) continue;

        spotifyQueryCacheRef.current.set(cacheKey, spotifyUri || null);
        cacheMap.set(cacheKey, spotifyUri || null);
      }

      if (rateLimited) {
        setSpotifyLookupMessage('Spotify rate limited, using iTunes fallback.');
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429) {
        const retryAfterSeconds = Number(error?.response?.data?.error?.retry_after || error?.response?.headers?.['retry-after'] || 0);
        const delayMs = Math.max(retryAfterSeconds * 1000, 5000);
        spotifyRateLimitUntilRef.current = Date.now() + delayMs;
        setSpotifyLookupMessage('Spotify rate limited, using iTunes fallback.');
      } else {
        console.warn('[Search] Spotify batch lookup failed', error);
      }
    } finally {
      if (Date.now() >= spotifyRateLimitUntilRef.current) {
        setSpotifyLookupMessage('');
      }
      setSpotifyLookupActive(false);
    }

    return cacheMap;
  };

  const ensureSpotifyUriForTrack = async (track) => {
    if (!track || track.spotifyUri || track.source !== 'youtube') return track;
    const cachedKey = normalizeSpotifyQueryKey(track.title || track.name, track.artist || track.artists?.[0]?.name);
    if (spotifyQueryCacheRef.current.has(cachedKey)) {
      const spotifyUri = spotifyQueryCacheRef.current.get(cachedKey);
      if (spotifyUri) {
        const spotifyUrl = track.spotifyUrl || spotifyUri.replace('spotify:track:', 'https://open.spotify.com/track/');
        const updatedTrack = { ...track, spotifyUri, spotifyUrl };
        setResults((prev) => prev.map((r) => (r.id === track.id || r._id === track._id ? updatedTrack : r)));
        return updatedTrack;
      }
      return track;
    }

    const cacheMap = await fetchSpotifyUrisForTracks([track]);
    const spotifyUri = cacheMap.get(cachedKey) || null;
    if (!spotifyUri) {
      return track;
    }

    const spotifyUrl = track.spotifyUrl || spotifyUri.replace('spotify:track:', 'https://open.spotify.com/track/');
    const updatedTrack = { ...track, spotifyUri, spotifyUrl };
    setResults((prev) => prev.map((r) => (r.id === track.id || r._id === track._id ? updatedTrack : r)));
    return updatedTrack;
  };

  const batchResolveSpotifyUris = async (queue) => {
    if (!Array.isArray(queue) || queue.length === 0) return;
    const toResolve = [];
    const seenKeys = new Set();

    for (const item of queue) {
      if (!item || item.spotifyUri || item.source !== 'youtube') continue;
      const key = normalizeSpotifyQueryKey(item.title || item.name, item.artist || item.artists?.[0]?.name);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      toResolve.push(item);
    }

    if (toResolve.length === 0) return;

    const cacheMap = await fetchSpotifyUrisForTracks(toResolve);
    const updates = [];

    for (const item of toResolve) {
      const key = normalizeSpotifyQueryKey(item.title || item.name, item.artist || item.artists?.[0]?.name);
      const spotifyUri = cacheMap.get(key);
      if (!spotifyUri) continue;
      const spotifyUrl = item.spotifyUrl || spotifyUri.replace('spotify:track:', 'https://open.spotify.com/track/');
      updates.push({ id: item.id, _id: item._id, spotifyUri, spotifyUrl });
    }

    if (updates.length > 0) {
      setResults((prev) => prev.map((r) => {
        const update = updates.find((u) => u.id === r.id || u._id === r._id);
        return update ? { ...r, spotifyUri: update.spotifyUri, spotifyUrl: update.spotifyUrl } : r;
      }));
    }
  };

  const runSearch = async (query, typeOverride) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const typeToUse = typeOverride || filterType;

    setCommittedQuery(trimmed);
    setLoading(true);
    setError(null);
    setResults([]);
    setSpotifyLookupActive(true);
    setSpotifyLookupMessage('Searching Spotify...');

    const normalizeResponse = (songs, sourceHint) => {
      return (songs || []).map((item) => ({
        ...item,
        source: item.source || sourceHint,
        type: item.type || 'song',
        title: item.title || item.name || 'Untitled',
        name: item.name || item.title || 'Untitled',
        artist: item.artist || item.channel || 'Unknown Artist',
        thumbnail: item.thumbnail || item.coverArtUrl || item.thumbnail_medium || '',
        coverArtUrl: item.coverArtUrl || item.thumbnail || item.thumbnail_medium || '',
      }));
    };

    try {
      let normalizedSongs = [];
      let spotifySearchUsed = false;

      try {
        const spotifyRes = await musicService.spotifySearch(trimmed, { limit: 20, type: typeToUse });
        const spotifyData = spotifyRes?.data;
        if (spotifyData?.success) {
          normalizedSongs = normalizeResponse(spotifyData.songs || [], 'spotify');
          spotifySearchUsed = normalizedSongs.length > 0;
        }
      } catch (spotifyError) {
        const status = spotifyError?.response?.status;
        const retryAfter = Number(spotifyError?.response?.data?.error?.retry_after || spotifyError?.response?.headers?.['retry-after'] || 0);
        if (status === 429 || retryAfter > 0) {
          const delayMs = Math.max(retryAfter * 1000, 5000);
          spotifyRateLimitUntilRef.current = Date.now() + delayMs;
          setSpotifyLookupMessage('Spotify rate limited, falling back to YouTube.');
        } else {
          console.warn('[Search] Spotify search failed, falling back to YouTube', spotifyError);
          setSpotifyLookupMessage('Spotify unavailable, falling back to YouTube.');
        }
      }

      if (!spotifySearchUsed) {
        const youtubeUrl = `${API_URL}/api/search?q=${encodeURIComponent(trimmed)}&limit=20&type=${typeToUse}`;
        const response = await fetch(youtubeUrl);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error?.message || 'Search endpoint returned failure');
        }
        normalizedSongs = normalizeResponse(data.songs || [], 'youtube');
      }

      setResults(normalizedSongs);
      
      // Update recent searches
      setRecentSearches(prev => {
        const updated = [trimmed, ...prev.filter(t => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
        localStorage.setItem("melodia_recent_searches", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Make sure the server is running and try again.");
    } finally {
      setLoading(false);
      if (Date.now() >= spotifyRateLimitUntilRef.current) {
        setSpotifyLookupActive(false);
        setSpotifyLookupMessage('');
      }
    }
  };


  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      runSearch(inputValue);
    }
  };

  const handlePopularClick = (term) => {
    setInputValue(term);
    runSearch(term);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInputValue("");
    setCommittedQuery("");
    setResults([]);
    setError(null);
    inputRef.current?.focus();
  };

  const handleItemClick = (item, e) => {
    if (e) e.stopPropagation();

    if (item.type === 'playlist') {
      navigate(`/yt-playlist/${item.id}`);
      return;
    }

    const isCurrent = currentTrack && (currentTrack.id === item.id || currentTrack._id === item._id);
    if (!isCurrent) {
      // Preview without affecting playback
      setPreviewTrack(item);
    }
    setNowPlayingOpen(true);
  };

  const handlePlayClick = async (item, e) => {
    e.stopPropagation();

    const isCurrent = currentTrack && (currentTrack.id === item.id || currentTrack._id === item._id);
    if (isCurrent) {
      if (!isPlaying) togglePlay();
      return;
    }

    const playableResults = results.filter((r) => r.type !== 'playlist');
    const updatedTrack = await ensureSpotifyUriForTrack(item);
    const itemIndex = playableResults.findIndex((r) => r.id === item.id || r._id === item._id);
    const upcomingQueue = itemIndex >= 0 ? playableResults.slice(itemIndex + 1, itemIndex + 1 + 2) : playableResults.slice(0, 2);

    void batchResolveSpotifyUris(upcomingQueue);

    void playTrack(updatedTrack, playableResults).catch((err) => {
      console.error('[Search] playTrack failed', err);
    });
  };

  const handleAddPlaylist = async (item, e) => {
    e.stopPropagation();
    try {
      console.log('📝 Adding playlist to library:', item.title, item.id);

      let songsToImport = [];
      const playlistId = typeof item.id === 'string'
        ? item.id
        : item.id?.playlistId || item._id;

      if (playlistId) {
        try {
          const result = await getPlaylist(playlistId);
          const fetchedPlaylist = result.playlist;
          console.log('🔍 Playlist fetch result for import:', playlistId, result);
          if (result.success && fetchedPlaylist?.songs?.length > 0) {
            songsToImport = (fetchedPlaylist.songs || []).map((song) => ({
              id: song.id || song.videoId || song._id,
              _id: song.id || song.videoId || song._id,
              videoId: song.videoId || song.id || song._id,
              title: song.title || song.name || 'Untitled',
              name: song.title || song.name || 'Untitled',
              artist: song.artist || song.channelTitle || 'Unknown',
              thumbnail: song.thumbnail || song.thumbnail_medium || song.coverArtUrl || '',
              duration: song.duration || 0,
              duration_string: song.duration_string || '0:00',
              url: song.url || `https://www.youtube.com/watch?v=${song.videoId || song.id || song._id}`,
              type: 'song',
              source: song.source || 'youtube',
            }));
          } else {
            console.warn('⚠️ Playlist import fetched no tracks:', playlistId, fetchedPlaylist);
          }
        } catch (playlistError) {
          console.warn('⚠️ Could not load full playlist details, falling back to search payload:', playlistError);
        }
      }

      if (songsToImport.length === 0) {
        songsToImport = (item.songs || []).map((song) => ({
          id: song.id || song.videoId || song._id,
          _id: song.id || song.videoId || song._id,
          videoId: song.videoId || song.id || song._id,
          title: song.title || song.name || 'Untitled',
          name: song.title || song.name || 'Untitled',
          artist: song.artist || song.channelTitle || 'Unknown',
          thumbnail: song.thumbnail || song.thumbnail_medium || song.coverArtUrl || '',
          duration: song.duration || 0,
          duration_string: song.duration_string || '0:00',
          url: song.url || `https://www.youtube.com/watch?v=${song.videoId || song.id || song._id}`,
          type: 'song',
          source: song.source || 'youtube',
        }));
      }

      const importedPlaylist = await createPlaylist(
        item.title || item.name || 'Untitled Playlist',
        item.description || 'Imported from search results',
        item.thumbnail || item.thumbnail_medium || item.coverImageUrl || item.coverArtUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
        songsToImport,
        'YouTube',
        false
      );

      console.log('✅ Playlist added to library:', importedPlaylist);
    } catch (err) {
      console.error('❌ Failed to add playlist:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 text-left" style={{ fontFamily: "Urbanist, sans-serif" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white mb-2">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find songs, albums, and artists in Melodia's high-res catalog.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-3 shadow-xl">
        <div className="flex items-center gap-3 bg-[#111120] rounded-xl px-4 py-2.5">
          <SearchIcon className="text-muted-foreground w-5 h-5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by title, artist, or album…"
            className="w-full bg-transparent text-white placeholder-muted-foreground focus:outline-none text-sm font-semibold"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          {inputValue && !loading && (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => runSearch(inputValue)}
            disabled={!inputValue.trim() || loading}
            className="flex-shrink-0 bg-primary hover:opacity-95 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Search
          </button>
        </div>
        
        {/* Search Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'song', 'artist', 'album', 'playlist'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setFilterType(type);
                if (inputValue.trim()) {
                  runSearch(inputValue, type);
                }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                filterType === type 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-[#111120] border border-white/5 text-muted-foreground hover:text-white"
              }`}
            >
              {type === 'all' ? 'All' : type + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-950/20 border border-red-500/20 text-red-200 rounded-xl px-4 py-3 text-xs max-w-2xl">
          {error}
        </div>
      )}
      {spotifyLookupActive && (
        <div className="bg-blue-950/20 border border-blue-500/20 text-blue-200 rounded-xl px-4 py-3 text-xs max-w-2xl">
          {spotifyLookupMessage || 'Loading Spotify results...'}
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              Results for "{committedQuery}"
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">
              {results.length} track{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in duration-200">
            {results.map((item) => {
              const isPlaylist = item.type === 'playlist';
              const isCurrent = !isPlaylist && currentTrack && (currentTrack.id === item.id || currentTrack._id === item._id);
              const showPlaying = isCurrent && isPlaying;
              
              return (
                <div
                  key={item.id || item._id}
                  onClick={() => handleItemClick(item)}
                  className="group relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)] flex flex-col"
                >
                  <div className={`relative aspect-square overflow-hidden bg-[#111120] ${isPlaylist ? 'rounded-b-none' : ''}`}>
                    <img
                      src={item.thumbnail || item.thumbnail_medium || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&auto=format"}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {!isPlaylist && (
                      <>
                        <div className="absolute top-2.5 left-2.5 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <AddToPlaylistDropdown song={item} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(item);
                          }}
                          className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg ${
                            isLiked(item)
                              ? "bg-primary text-white scale-100"
                              : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100 md:scale-90 md:group-hover:scale-100"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked(item) ? "fill-white text-white" : ""}`} />
                        </button>
                      </>
                    )}

                    {isPlaylist && (
                      <>
                        <div className="absolute top-2.5 left-2.5 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleAddPlaylist(item, e)}
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-md transition-all cursor-pointer shadow-lg"
                            title="Add Playlist to Library"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="absolute top-2.5 right-2.5 z-20 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                          Playlist
                        </div>
                      </>
                    )}

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {!isPlaylist ? (
                        <button
                          onClick={(e) => handlePlayClick(item, e)}
                          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          {item.spotifyLoading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : showPlaying ? (
                            <Pause className="w-5 h-5 text-white fill-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                          )}
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-white/30">
                          <Music className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    {isCurrent && (
                      <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        {isPlaying ? (
                          <span className="flex gap-0.5 items-end" style={{ height: 10 }}>
                            <span className="w-0.5 bg-white animate-pulse" style={{ height: "60%" }} />
                            <span className="w-0.5 bg-white animate-pulse" style={{ height: "100%" }} />
                            <span className="w-0.5 bg-white animate-pulse" style={{ height: "40%" }} />
                          </span>
                        ) : (
                          <Pause className="w-3 h-3 text-white fill-white" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-left">
                    <p className={`text-sm font-bold truncate ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {isPlaylist
                        ? `${item.videoCount || item.songs?.length || 'Playlist'} tracks${item.artist && item.artist.toLowerCase() !== "youtube playlist" ? ` • ${item.artist}` : ""}`
                        : item.artist}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results Fallback */}
      {committedQuery && !loading && !error && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-card/20">
          <Music className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-base font-bold text-white mb-1">No Results Found</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            We couldn't find anything matching "{committedQuery}". Try searching for another keyword.
          </p>
        </div>
      )}

      {/* Popular and Recent Searches */}
      {!committedQuery && !loading && (
        <div className="space-y-8">
          {recentSearches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Recent Searches</h3>
                <button
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem("melodia_recent_searches");
                  }}
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={`recent-${term}`}
                    onClick={() => handlePopularClick(term)}
                    className="bg-[#111120] border border-border text-primary hover:text-white hover:bg-primary/20 hover:border-primary/50 px-4 py-2 rounded-full cursor-pointer transition-all duration-150 text-xs font-semibold"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-base font-bold text-white">Popular Searches</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={`popular-${term}`}
                  onClick={() => handlePopularClick(term)}
                  className="bg-[#111120] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 px-4 py-2 rounded-full cursor-pointer transition-all duration-150 text-xs font-semibold"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
