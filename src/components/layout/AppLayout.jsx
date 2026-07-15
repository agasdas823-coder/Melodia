import { useState, useEffect } from "react";

import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import LyricsModal from "../player/LyricsModal";
import NowPlayingPanel from "../player/NowPlayingPanel";
import AddToPlaylistDropdown from "../playlist/AddToPlaylistDropdown";
import PlaylistCover from "../playlist/PlaylistCover";
import SourceBadge from "../player/SourceBadge";
import CreatePlaylistModal from "../CreatePlaylistModal";
import { playlistService } from "../../services/apiService";
import {
  Home,
  Search as SearchIcon,
  Library,
  Heart,
  Plus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Music2,
  Bell,
  User,
  ListMusic,
  LogOut,
  Shield,
  Clock,
  Maximize2,
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    muted,
    toggleMute,
    lyricsOpen,
    setLyricsOpen,
    toggleLike,
    isLiked,
    playlists,
    createPlaylist,
    nowPlayingOpen,
    setNowPlayingOpen,
    activeSource,
  } = usePlayer();

  const navigate = useNavigate();
  const location = useLocation();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [repeated, setRepeated] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Avatar from user context
  const userAvatar = user?.avatar || null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleCreatePlaylist = async (payload) => {
    setCreatingPlaylist(true);
    try {
      const response = await playlistService.create(payload);
      const created = response?.data?.playlist || response?.data;

      if (created) {
        createPlaylist(
          created.name || payload.name,
          created.description || payload.description,
          created.coverImage || payload.coverImage || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
          [],
          user?.username || user?.email || "You",
          payload.isPrivate === false ? false : payload.isPrivate,
          created.shareUrl || payload.shareUrl
        );
      } else {
        createPlaylist(
          payload.name,
          payload.description || "Custom playlist created from the sidebar.",
          payload.coverImage || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
          [],
          user?.username || user?.email || "You",
          payload.isPrivate === false ? false : payload.isPrivate,
          undefined
        );
      }
    } catch (error) {
      console.error("Failed to create playlist", error);
      createPlaylist(
        payload.name,
        payload.description || "Custom playlist created from the sidebar.",
        payload.coverImage || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60",
        [],
        user?.username || user?.email || "You",
        payload.isPrivate === false ? false : payload.isPrivate,
        undefined
      );
    } finally {
      setCreatingPlaylist(false);
      setShowCreateModal(false);
    }
  };

  // Source-status toasts removed as per instruction

  const isActive = (path) => location.pathname === path;

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null || secs === undefined) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSeekChange = (e) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };


  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "Urbanist, sans-serif" }}
    >
      {/* Sonner toast container */}
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(14,14,28,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e2f0",
            backdropFilter: "blur(12px)",
            fontSize: "13px",
          },
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop Only) */}
        <aside
          className="hidden md:flex w-64 shrink-0 flex-col border-r border-border overflow-hidden"
          style={{ background: "var(--sidebar)" }}
        >
          {/* Logo */}
          <div className="px-6 py-6 flex items-center">
            <img src="/logo-landing.png" alt="Melodia Logo" className="w-44 h-auto object-contain" />
          </div>

          {/* Navigation */}
          <nav className="px-3 space-y-0.5">
            <Link
              to="/explore"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive("/explore")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <Home className={`w-4 h-4 shrink-0 ${isActive("/explore") ? "text-primary" : ""}`} />
              Home
            </Link>
            <Link
              to="/search"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive("/search")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <SearchIcon className={`w-4 h-4 shrink-0 ${isActive("/search") ? "text-primary" : ""}`} />
              Search
            </Link>
            <Link
              to="/library"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive("/library")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <Library className={`w-4 h-4 shrink-0 ${isActive("/library") ? "text-primary" : ""}`} />
              My Library
            </Link>
            <Link
              to="/recents"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive("/recents")
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <Clock className={`w-4 h-4 shrink-0 ${isActive("/recents") ? "text-primary" : ""}`} />
              Recents
            </Link>
            {user?.role === "admin" && (
              <Link
                to="/admin"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive("/admin")
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
              >
                <Shield className={`w-4 h-4 shrink-0 ${isActive("/admin") ? "text-primary" : ""}`} />
                Admin Panel
              </Link>
            )}
          </nav>

          {/* Divider */}
          <div className="mx-6 my-4 border-t border-border" />

          {/* Playlists in Sidebar */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-none">
            <div className="flex items-center justify-between px-3 mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest select-none">Playlists</span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-6 h-6 rounded-md bg-muted/60 flex items-center justify-center hover:bg-primary/20 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
                title="Create Playlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Liked Songs */}
            <Link
              to="/library"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 mb-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="truncate font-medium">Liked Songs</span>
            </Link>
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <PlaylistCover
                    songs={pl.songs || []}
                    coverImageUrl={pl.coverImageUrl}
                    name={pl.name}
                    isAi={pl.isAiGenerated}
                    iconSize={16}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium truncate text-foreground/80">{pl.name}</p>
                  <p className="text-xs text-muted-foreground">{pl.songs?.length || 0} tracks</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 shrink-0 flex items-center justify-between px-6 md:px-8 border-b border-border bg-[#07070F]/80 backdrop-blur-md z-30">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground capitalize">
                {isActive("/explore")
                  ? "Good evening"
                  : isActive("/search")
                    ? "Search"
                    : isActive("/library")
                      ? "My Library"
                      : isActive("/admin")
                        ? "Admin Dashboard"
                        : isActive("/account")
                          ? "Account Overview"
                          : "Music Studio"}
              </span>
            </div>

            {/* Unified Account Info Badge in Top Right */}
            <div className="flex items-center gap-3">
              {/* Bell Icon Removed as requested */}

              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 rounded-full bg-[#111120] border border-white/10 pl-1 pr-3 py-1 hover:bg-[#1a1a2e] transition-colors cursor-pointer"
                >
                  {userAvatar ? (
                    <img src={userAvatar} alt={user?.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold font-mono">
                      {user?.username ? user.username.slice(0, 2).toUpperCase() : "U"}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-foreground max-w-[96px] truncate">
                    {user?.username || "Guest"}
                  </span>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-9 w-48 bg-[#0E0E1C] border border-border rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <div className="px-3 py-1.5 border-b border-border/40 mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{user?.username || "Guest"}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{user?.role || "User"} Account</p>
                    </div>
                    {user?.role === "admin" && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-semibold"
                      >
                        <Shield className="w-3.5 h-3.5" /> Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/account"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-semibold"
                    >
                      <User className="w-3.5 h-3.5" /> Account Overview
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors text-left cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto scrollbar-none pb-24">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Player Bar */}
      {currentTrack && (
        <div
          className="h-20 shrink-0 flex items-center px-4 gap-4 border-t border-border backdrop-blur-xl fixed bottom-0 left-0 w-full z-40"
          style={{ background: "rgba(7,7,15,0.95)" }}
        >
          {/* Track info */}
          <div className="flex items-center gap-3 w-60 shrink-0 text-left">
            <div
              onClick={() => setNowPlayingOpen(true)}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
              title="Open Now Playing"
            >
              <img
                src={currentTrack.thumbnail || currentTrack.thumbnail_medium || currentTrack.coverArtUrl || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop&auto=format"}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted border border-white/5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{currentTrack.title}</p>
                  <SourceBadge source={activeSource} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleLike(currentTrack)}
                className={`transition-colors cursor-pointer ${isLiked(currentTrack) ? "text-primary hover:text-primary" : "text-muted-foreground hover:text-white"
                  }`}
              >
                <Heart className={`w-4 h-4 ${isLiked(currentTrack) ? "fill-primary text-primary" : ""}`} />
              </button>
              <AddToPlaylistDropdown song={currentTrack} />
            </div>
          </div>

          {/* Playback Controls & Seekbar */}
          <div className="flex-grow flex flex-col items-center max-w-xl mx-auto gap-1">
            <div className="flex items-center gap-5">
              <button
                onClick={() => setShuffled(!shuffled)}
                className={`text-muted-foreground hover:text-white transition-colors cursor-pointer ${shuffled ? "text-primary hover:text-primary" : ""}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={prevTrack}
                className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <SkipBack className="w-4.5 h-4.5 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
              </button>
              <button
                onClick={nextTrack}
                className="text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <SkipForward className="w-4.5 h-4.5 fill-current" />
              </button>
              <button
                onClick={() => setRepeated(!repeated)}
                className={`text-muted-foreground hover:text-white transition-colors cursor-pointer ${repeated ? "text-primary hover:text-primary" : ""}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Seekbar */}
            <div className="flex items-center gap-3 w-full text-xs font-semibold text-muted-foreground font-mono">
              <span className="w-10 text-right">{formatTime(progress)}</span>
              <div className="flex-grow h-1 rounded-full bg-muted relative group cursor-pointer flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={progress}
                  onChange={handleSeekChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className="h-full bg-primary rounded-full absolute left-0 top-0 group-hover:bg-accent transition-colors"
                  style={{ width: `${(progress / (duration || 1)) * 100}%` }}
                />
              </div>
              <span className="w-10 text-left">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume and Lyric Options */}
          <div className="flex items-center justify-end gap-3 w-60 shrink-0 text-muted-foreground">
            <button
              onClick={() => setNowPlayingOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
              title="Expand Player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLyricsOpen(!lyricsOpen)}
              className={`hover:text-white transition-colors cursor-pointer ${lyricsOpen ? "text-primary" : ""}`}
              title="Lyrics"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            <button
              onClick={toggleMute}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-20 h-1 rounded-full bg-muted relative group cursor-pointer flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
                style={{ width: `${(muted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Modal */}
      <LyricsModal />

      {/* Full-screen Now Playing Panel */}
      <NowPlayingPanel isOpen={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />

      {/* Mobile Nav Tabs (BottomNavBar) */}
      <nav className="md:hidden flex items-center justify-between px-6 w-full fixed bottom-0 left-0 z-40 h-16 bg-[#0E0E1C]/95 backdrop-blur-xl border-t border-border shadow-2xl">
        <Link
          to="/explore"
          className={`flex flex-col items-center gap-1 transition-transform active:scale-95 ${isActive("/explore") ? "text-primary font-bold" : "text-muted-foreground hover:text-white"
            }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </Link>
        <Link
          to="/search"
          className={`flex flex-col items-center gap-1 transition-transform active:scale-95 ${isActive("/search") ? "text-primary font-bold" : "text-muted-foreground hover:text-white"
            }`}
        >
          <SearchIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
        </Link>
        <Link
          to="/library"
          className={`flex flex-col items-center gap-1 transition-transform active:scale-95 ${isActive("/library") ? "text-primary font-bold" : "text-muted-foreground hover:text-white"
            }`}
        >
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Library</span>
        </Link>
      </nav>
      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePlaylist}
        submitting={creatingPlaylist}
      />    </div>
  );
}
