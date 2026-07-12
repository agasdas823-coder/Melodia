import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { Plus, Heart, Music2, Sparkles, Play, Pause, ChevronRight } from "lucide-react";
import PlaylistCover from "../components/playlist/PlaylistCover";

export default function Library() {
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay, likedSongs, playlists, createPlaylist, setNowPlayingOpen, setPreviewTrack } = usePlayer();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("liked");
  const [generating, setGenerating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    if (likedSongs.length > 0) {
      import('../utils/MusicSourceManager').then(({ musicSourceManager }) => {
        musicSourceManager.prefetchBatch(likedSongs).catch(() => {});
      });
    }
  }, [likedSongs.length]);

  const handleManualCreate = () => {
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), "Custom playlist created in library.");
    setNewPlaylistName("");
    setShowCreateForm(false);
    setActiveTab("playlists");
  };

  const handleGenerateSmartPlaylist = () => {
    setGenerating(true);
    setTimeout(() => {
      const artistNames = likedSongs.map((s) => s.artist);
      const uniqueArtist = artistNames.length > 0 ? artistNames[0] : "Acoustics";

      createPlaylist(
        `🔮 Your ${uniqueArtist} Mix`,
        `Auto-generated smart mix optimized around your interest in ${uniqueArtist}.`,
        likedSongs[0]?.thumbnail || likedSongs[0]?.thumbnail_medium || likedSongs[0]?.coverArtUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=60",
        likedSongs.slice(0, 8)
      );
      setActiveTab("playlists");
      setGenerating(false);
    }, 1800);
  };

  const handleRowClick = (song) => {
    const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
    if (isCurrent) {
      if (!isPlaying) togglePlay();
    } else {
      playTrack(song, likedSongs);
    }
  };

  const formatDuration = (secs) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 text-left animate-in fade-in duration-200" style={{ fontFamily: "Urbanist, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-2">My Library</h1>
          <p className="text-sm text-muted-foreground">Manage your playlists and liked songs collections.</p>
        </div>

        {/* Playlist Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {showCreateForm ? (
            <div className="flex items-center gap-2 bg-[#111120] border border-white/10 rounded-xl p-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <input
                type="text"
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="bg-transparent text-xs text-white px-3 py-1.5 outline-none placeholder-muted-foreground font-semibold"
                autoFocus
              />
              <button
                onClick={handleManualCreate}
                disabled={!newPlaylistName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 transition-opacity cursor-pointer"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewPlaylistName(""); }}
                className="px-2 py-1.5 rounded-lg text-muted-foreground hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Playlist
              </button>
              
              <button
                onClick={handleGenerateSmartPlaylist}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/20 border border-primary/40 hover:bg-primary/30 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer w-fit"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? "Generating Smart Mix..." : "Generate Smart Playlist"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#111120] border border-border/40 rounded-xl p-1 w-fit">
        {(["liked", "playlists"]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer ${
              activeTab === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "liked" ? "Liked Songs" : "Playlists"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "liked" && (
        <section className="space-y-3">
          {likedSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-card/20">
              <Heart className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-base font-bold text-white mb-1">No liked songs yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">Explore the catalogue and heart tracks you love to see them here.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Row headers */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/25 select-none">
                <span className="w-8 text-center">#</span>
                <span className="flex-grow">Title</span>
                <span className="hidden md:block w-32">Genre</span>
                <span className="w-12 text-right">Time</span>
              </div>

              {likedSongs.map((song, i) => {
                const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
                const showPlaying = isCurrent && isPlaying;
                return (
                  <div
                    key={song.id || song._id}
                    onClick={() => handleRowClick(song)}
                    className={`group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                      isCurrent ? "bg-primary/10 border border-primary/25" : "hover:bg-card/60 border border-transparent"
                    }`}
                  >
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {isCurrent ? (
                        showPlaying ? (
                          <span className="flex gap-0.5 items-end h-4">
                            <span className="w-0.5 bg-primary animate-pulse" style={{ height: "60%" }} />
                            <span className="w-0.5 bg-primary animate-pulse" style={{ height: "100%" }} />
                            <span className="w-0.5 bg-primary animate-pulse" style={{ height: "40%" }} />
                          </span>
                        ) : (
                          <Pause className="w-3.5 h-3.5 text-primary fill-primary" />
                        )
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground group-hover:hidden">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                      {!isCurrent && (
                        <Play className="w-3.5 h-3.5 text-primary fill-primary hidden group-hover:block" />
                      )}
                    </div>
                    <img
                    onClick={(e) => {
                        e.stopPropagation();
                        const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
                        if (!isCurrent) setPreviewTrack(song);
                        setNowPlayingOpen(true);
                      }}
                      src={song.thumbnail || song.thumbnail_medium || song.coverArtUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop&auto=format"}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#111120] cursor-pointer hover:opacity-85 transition-opacity"
                    />
                    <div className="flex-grow min-w-0 text-left">
                      <p className={`text-sm font-bold truncate ${isCurrent ? "text-primary" : "text-white"}`}>
                        {song.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="hidden md:block text-xs text-muted-foreground w-32 truncate text-left">{song.genre || "Acoustics"}</span>
                    <span className="text-xs text-muted-foreground font-mono w-12 text-right">{formatDuration(song.duration)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "playlists" && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Liked songs helper card */}
          <div
            onClick={() => setActiveTab("liked")}
            className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/15 border border-primary/20 p-4 cursor-pointer hover:border-primary/40 transition-all group text-left"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shrink-0">
              <Heart className="w-7 h-7 text-white fill-white animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Liked Songs Collection</p>
              <p className="text-xs text-muted-foreground">{likedSongs.length} tracks saved</p>
            </div>
          </div>

          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlist/${pl.id}`)}
              className="flex items-center gap-4 rounded-2xl bg-card border border-border p-4 cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all group text-left"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#111120] shrink-0">
                <PlaylistCover
                  songs={pl.songs || []}
                  coverImageUrl={pl.coverImageUrl}
                  name={pl.name}
                  isAi={pl.isAiGenerated}
                  iconSize={28}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                  {pl.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{pl.description}</p>
                <span className="inline-block mt-1 text-[10px] text-muted-foreground">
                  Created by {pl.createdBy || user?.username || 'You'}
                </span>
                <span className="inline-block mt-1.5 text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                  {pl.songs ? pl.songs.length : 0} Tracks
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
