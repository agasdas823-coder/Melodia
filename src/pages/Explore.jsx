import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { usePlayer } from "../context/PlayerContext";
import { Sparkles, Heart, Play, Pause, ChevronRight, TrendingUp, Mic, Award, Plus, Music } from "lucide-react";
import { motion } from "framer-motion";
import AddToPlaylistDropdown from "../components/playlist/AddToPlaylistDropdown";

const GENRES = [
  { id: 1, name: "Electronic", gradient: "from-violet-600 via-purple-700 to-indigo-800", icon: "⚡", count: "2.1k tracks" },
  { id: 2, name: "Hip-Hop", gradient: "from-orange-500 via-rose-600 to-red-700", icon: "🎤", count: "1.8k tracks" },
  { id: 3, name: "Indie", gradient: "from-emerald-500 via-teal-600 to-cyan-700", icon: "🎸", count: "980 tracks" },
  { id: 4, name: "R&B", gradient: "from-pink-500 via-fuchsia-600 to-purple-700", icon: "🎵", count: "1.3k tracks" },
  { id: 5, name: "Jazz", gradient: "from-amber-500 via-orange-600 to-yellow-700", icon: "🎺", count: "640 tracks" },
  { id: 6, name: "Classical", gradient: "from-sky-500 via-blue-600 to-indigo-700", icon: "🎻", count: "820 tracks" },
  { id: 7, name: "Pop", gradient: "from-rose-500 via-pink-600 to-fuchsia-700", icon: "✨", count: "3.4k tracks" },
  { id: 8, name: "Lo-Fi", gradient: "from-slate-500 via-zinc-600 to-stone-700", icon: "☁️", count: "440 tracks" },
];

const ARTISTS = [
  { id: 1, name: "Luna Vega", genre: "Electronic", followers: "4.2M", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format" },
  { id: 2, name: "Solène Maro", genre: "R&B / Soul", followers: "2.9M", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&auto=format" },
  { id: 3, name: "Axiom Wave", genre: "Electronic", followers: "1.7M", img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&auto=format" },
  { id: 4, name: "Elara Jay", genre: "Indie / Folk", followers: "3.1M", img: "https://images.unsplash.com/photo-1534180477871-5d6cc81f3d35?w=200&h=200&fit=crop&auto=format" },
  { id: 5, name: "KXRPSE", genre: "Hip-Hop", followers: "890K", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format" },
];

const MOOD_QUERIES = {
  "Energizing": "upbeat energetic dance hits",
  "Chill": "chill lo-fi relaxing music",
  "Workout": "workout motivation hip hop",
  "Melancholic": "sad melancholic indie songs",
  "Dreamy": "dreamy ambient ethereal music",
};

export default function Explore() {
  const { currentTrack, isPlaying, playTrack, togglePlay, toggleLike, isLiked, recentTracks, createPlaylist, prefetchTrack } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilterTab, setActiveFilterTab] = useState("all");
  const [selectedSubFilter, setSelectedSubFilter] = useState(null);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [newReleaseSongs, setNewReleaseSongs] = useState([]);

  // Fetch new releases for the "New Release" banner
  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/search?q=top+hits&limit=10`);
        setNewReleaseSongs(res.data.songs || []);
      } catch (_) {
        setNewReleaseSongs([]);
      }
    };
    fetchNewReleases();
  }, []);

  // Build dynamic featured list:
  // 1. Most listened song's album (from recentTracks - the most played one)
  // 2. New releases (from API)
  // No Editor's Pick
  const dynamicFeatured = [];

  // Most listened: use the first recentTrack (most recently/frequently played)
  if (recentTracks && recentTracks.length > 0) {
    const mostListened = recentTracks[0];
    dynamicFeatured.push({
      id: mostListened.id || mostListened._id,
      title: mostListened.album || mostListened.title,
      subtitle: mostListened.artist,
      tag: "Most Listened Album",
      image: mostListened.thumbnail || mostListened.thumbnail_medium || "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&h=600&fit=crop&auto=format",
      accent: "#8B5CF6",
      track: mostListened,
    });
  }

  // New releases
  if (newReleaseSongs.length > 0) {
    newReleaseSongs.slice(0, 2).forEach((track, idx) => {
      dynamicFeatured.push({
        id: track.id || track._id,
        title: track.title,
        subtitle: track.artist,
        tag: "New Release",
        image: track.thumbnail || track.thumbnail_medium || "https://images.unsplash.com/photo-1429514513361-8fa32282fd5f?w=1200&h=600&fit=crop&auto=format",
        accent: "#6366F1",
        track: track,
      });
    });
  }

  // Fallback if no data at all
  if (dynamicFeatured.length === 0) {
    dynamicFeatured.push({
      title: "Discover New Music",
      subtitle: "Explore trending tracks",
      tag: "Trending",
      image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&h=600&fit=crop&auto=format",
      accent: "#8B5CF6",
    });
  }

  const currentHero = dynamicFeatured[featuredIdx % dynamicFeatured.length] || dynamicFeatured[0];
  const isHeroLiked = currentHero.track
    ? isLiked(currentHero.track)
    : isLiked({ id: currentHero.title, title: currentHero.title, artist: currentHero.subtitle });

  // Auto scroll featured slideshow
  useEffect(() => {
    const totalSlides = dynamicFeatured.length || 1;
    const t = setInterval(() => setFeaturedIdx((i) => (i + 1) % totalSlides), 6000);
    return () => clearInterval(t);
  }, [dynamicFeatured.length]);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/search?q=top+hits+2024&limit=20`;

      if (activeFilterTab === "genre" && selectedSubFilter) {
        endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/search?q=${encodeURIComponent(selectedSubFilter)}&limit=20`;
      } else if (activeFilterTab === "artist" && selectedSubFilter) {
        endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/search?q=${encodeURIComponent(selectedSubFilter)}&limit=20`;
      } else if (activeFilterTab === "mood" && selectedSubFilter) {
        const moodQuery = selectedSubFilter;
        endpoint = `${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/search?q=${encodeURIComponent(moodQuery)}&limit=20`;
      }

      const response = await axios.get(endpoint);
      setSongs(response.data.songs || []);
    } catch (err) {
      console.error("Failed to fetch songs:", err);
      // Fallback local mock list if offline or api fails
      setSongs([
        { id: "s1", title: "Kind of Blue", artist: "Miles Davis", genre: "Jazz", duration: 320, coverArtUrl: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=300&h=300&fit=crop&auto=format", youtubeVideoId: "F3W_alqaHY0" },
        { id: "s2", title: "So What", artist: "Miles Davis", genre: "Jazz", duration: 560, coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop&auto=format", youtubeVideoId: "ylXk1gKBfM8" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [activeFilterTab, selectedSubFilter]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = (song) => {
    if (song.type === 'playlist') return; // Only prefetch songs
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      prefetchTrack(song);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handlePlayClick = (song, e) => {
    if (e) e.stopPropagation();
    
    if (song.type === 'playlist') {
      window.location.href = `/yt-playlist/${song.id}`;
      return;
    }

    const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
    if (isCurrent) {
      togglePlay();
    } else {
      const playableSongs = songs.filter(s => s.type !== 'playlist');
      playTrack(song, playableSongs);
    }
  };

  const handleAddPlaylist = async (item, e) => {
    e.stopPropagation();
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5002"}/api/youtube-playlist/${item.id}`);
      const data = response.data;
      createPlaylist(item.title, "Imported from YouTube", item.thumbnail || item.thumbnail_medium, data.playlist?.songs || [], "YouTube");
    } catch (err) {
      console.error("Failed to add playlist:", err);
    }
  };

  const handleGenreClick = (genreName) => {
    setActiveFilterTab("genre");
    setSelectedSubFilter(genreName);
  };

  const handleArtistClick = (artistName) => {
    setActiveFilterTab("artist");
    setSelectedSubFilter(artistName);
  };

  return (
    <div className="pb-12" style={{ fontFamily: "Urbanist, sans-serif" }}>
      {/* Featured Hero Slideshow */}
      <div className="relative h-72 overflow-hidden mx-6 mt-6 rounded-3xl border border-border/40 shadow-xl select-none group">
        <img
          src={currentHero.image}
          alt={currentHero.title}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 transform group-hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07070F] via-[#07070F]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070F] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-8 pb-8 text-left">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" /> {currentHero.tag}
          </span>
          <h1 className="text-4xl font-extrabold text-white leading-none mb-1">{currentHero.title}</h1>
          <p className="text-lg text-[#A9A9CC] font-medium mb-5">{currentHero.subtitle}</p>
          <div className="flex items-center gap-3">
            {currentHero.track ? (
              <button
                onClick={(e) => handlePlayClick(currentHero.track, e)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 cursor-pointer animate-in fade-in duration-200"
              >
                {currentTrack && (currentTrack.id === currentHero.track.id || currentTrack._id === currentHero.track._id) && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-white text-white" /> Pause Song
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white text-white" /> Play Song
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => handleArtistClick(currentHero.subtitle)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/30 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white text-white" /> View Artist
              </button>
            )}
            <button 
              onClick={() => {
                if (currentHero.track) {
                  toggleLike(currentHero.track);
                } else {
                  toggleLike({ id: currentHero.title, title: currentHero.title, artist: currentHero.subtitle, coverArtUrl: currentHero.image });
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/15 cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isHeroLiked ? "fill-primary text-primary" : ""}`} /> 
              {isHeroLiked ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="absolute top-4 right-5 flex gap-1.5">
          {dynamicFeatured.map((_, i) => (
            <button
              key={i}
              onClick={() => setFeaturedIdx(i)}
              className={`rounded-full transition-all duration-300 cursor-pointer ${i === featuredIdx ? "w-6 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 md:px-8 pt-8 space-y-8 text-left">
        {/* Filter Toolbar / Chip Row */}
        <div>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {(["all", "artist", "genre", "mood"]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveFilterTab(tab);
                  setSelectedSubFilter(null);
                }}
                className={`px-5 py-2 rounded-full text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  activeFilterTab === tab
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-[#111120] border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab === "all" ? "All Tracks" : tab}
              </button>
            ))}
          </div>

          {/* Sub Filters Row */}
          {activeFilterTab !== "all" && (
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar py-2 border-t border-border/30 mt-2 animate-in fade-in duration-200">
              {activeFilterTab === "genre" &&
                GENRES.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setSelectedSubFilter(g.name === selectedSubFilter ? null : g.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedSubFilter === g.name
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              {activeFilterTab === "artist" &&
                ARTISTS.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setSelectedSubFilter(a.name === selectedSubFilter ? null : a.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedSubFilter === a.name
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              {activeFilterTab === "mood" &&
                Object.keys(MOOD_QUERIES).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedSubFilter(m === selectedSubFilter ? null : m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedSubFilter === m
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Dynamic Songs Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                {selectedSubFilter ? `${selectedSubFilter} Tracks` : "Trending Now"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">{songs.length} tracks</span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl bg-card/40">
              <p className="text-sm font-bold text-muted-foreground">No songs found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {songs.map((song) => {
                const isPlaylist = song.type === 'playlist';
                const isCurrent = !isPlaylist && currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
                const showPlaying = isCurrent && isPlaying;
                return (
                  <div
                    key={song.id || song._id}
                    onClick={() => handlePlayClick(song)}
                    onMouseEnter={() => handleMouseEnter(song)}
                    onMouseLeave={handleMouseLeave}
                    className="group relative rounded-2xl overflow-hidden bg-card border border-border cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)] flex flex-col"
                  >
                    <div className={`relative aspect-square overflow-hidden bg-[#111120] ${isPlaylist ? 'rounded-b-none' : ''}`}>
                      <img
                        src={song.thumbnail || song.thumbnail_medium || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&auto=format"}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      
                      {!isPlaylist && (
                        <>
                          <div className="absolute top-2.5 left-2.5 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <AddToPlaylistDropdown song={song} />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLike(song);
                            }}
                            className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg ${
                              isLiked(song)
                                ? "bg-primary text-white scale-100"
                                : "bg-black/40 text-white/80 hover:text-white hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100 md:scale-90 md:group-hover:scale-100"
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked(song) ? "fill-white text-white" : ""}`} />
                          </button>
                        </>
                      )}

                      {isPlaylist && (
                        <>
                          <div className="absolute top-2.5 left-2.5 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleAddPlaylist(song, e)}
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
                            onClick={(e) => handlePlayClick(song, e)}
                            className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            {showPlaying ? (
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
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {isPlaylist ? `${song.videoCount || 0} tracks${song.artist && song.artist.toLowerCase() !== "youtube playlist" ? ` • ${song.artist}` : ""}` : song.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Browse Genres Grid */}
        {activeFilterTab === "all" && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Browse by Genre</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => handleGenreClick(genre.name)}
                  className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${genre.gradient} aspect-square flex flex-col items-start justify-end p-3 hover:scale-105 transition-transform duration-200 shadow-lg cursor-pointer text-left`}
                >
                  <div className="absolute top-2 right-2 text-2xl">{genre.icon}</div>
                  <p className="text-sm font-bold text-white leading-tight">{genre.name}</p>
                  <p className="text-xs text-white/70">{genre.count}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Spotlight Artists Section */}
        {activeFilterTab === "all" && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-4 h-4 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Spotlight Artists</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {ARTISTS.map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => handleArtistClick(artist.name)}
                  className="rounded-2xl bg-card border border-border p-4 hover:border-primary/30 hover:shadow-lg transition-all text-center cursor-pointer group"
                >
                  <div className="relative w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 bg-[#111120]">
                    <img
                      src={artist.img}
                      alt={artist.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="text-sm font-bold text-white truncate">{artist.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{artist.followers} followers</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
