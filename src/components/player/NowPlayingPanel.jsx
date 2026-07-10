import { useEffect, useRef, useState } from "react";
import { usePlayer } from "../../context/PlayerContext";
import { Heart, Plus, Share2, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, X, MoreHorizontal, ArrowLeft, Check } from "lucide-react";
import AddToPlaylistDropdown from "../playlist/AddToPlaylistDropdown";

export default function NowPlayingPanel({ isOpen, onClose }) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    toggleLike,
    isLiked,
    queue,
    playTrack,
    isShuffled,
    isLooped,
    toggleShuffle,
    toggleLoop
  } = usePlayer();

  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!currentTrack) return;
    const url = `${window.location.origin}/track/${currentTrack.id || currentTrack._id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!currentTrack) return null;

  const percent = duration > 0 ? (progress / duration) * 100 : 0;

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === null || secs === undefined) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Upcoming queue (excluding current track)
  const upcomingQueue = queue.filter(
    (s) => (s.id || s._id) !== (currentTrack.id || currentTrack._id)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md transition-all duration-500"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-x-0 bottom-0 z-[70] flex flex-col"
        style={{
          height: "92vh",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.55s cubic-bezier(0.32, 0.72, 0, 1)",
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
          background: "#0d0d14",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Dynamic background using album art */}
        <div className="absolute inset-0">
          <img
            src={currentTrack.thumbnail || currentTrack.thumbnail_medium || currentTrack.coverArtUrl || "https://images.unsplash.com/photo-1549046701-6bd11cf71796?w=400&h=400&fit=crop&auto=format"}
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{ filter: "blur(80px)", opacity: 0.35 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0a1a]/60 via-[#0d0d14]/85 to-[#0d0d14]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full overflow-y-auto scrollbar-none">
          {/* Drag handle / close */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <button
              onClick={onClose}
              className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
              aria-label="Close panel"
            />
          </div>

          <div className="flex items-center justify-between px-8 py-3 shrink-0">
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-white/50 tracking-wider uppercase">Now Playing</span>
            <div className="w-5" />
          </div>

          {/* Main content */}
          <div className="flex-1 px-8 pb-8">
            <div className="max-w-3xl mx-auto flex flex-col gap-8">
              
              {/* Album art + song info */}
              <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-end mt-4">
                <div
                  className="w-56 h-56 sm:w-64 sm:h-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/5"
                  style={{
                    transform: isOpen ? "scale(1) translateY(0)" : "scale(0.85) translateY(20px)",
                    transition: "transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    transitionDelay: isOpen ? "0.15s" : "0s",
                  }}
                >
                  <img
                    src={currentTrack.thumbnail || currentTrack.thumbnail_medium || currentTrack.coverArtUrl || "https://images.unsplash.com/photo-1549046701-6bd11cf71796?w=400&h=400&fit=crop&auto=format"}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div
                  className="flex-1 min-w-0 text-center sm:text-left"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(16px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                    transitionDelay: isOpen ? "0.2s" : "0s",
                  }}
                >
                  <div className="inline-block text-xs font-semibold tracking-widest text-violet-400 uppercase mb-3 bg-violet-900/30 px-3 py-1 rounded-full">
                    {currentTrack.genre || "Music"}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight mb-2 truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-lg text-white/50 font-medium mb-6 truncate">{currentTrack.artist}</p>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    <button
                      onClick={() => toggleLike(currentTrack)}
                      className={`w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                        isLiked(currentTrack) ? "text-primary" : "text-white/60 hover:text-white"
                      }`}
                      title="Like song"
                    >
                      <Heart className={`w-[18px] h-[18px] ${isLiked(currentTrack) ? "fill-primary" : ""}`} />
                    </button>
                    
                    <AddToPlaylistDropdown song={currentTrack} />

                    <button
                      onClick={handleShare}
                      className={`w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${copied ? 'text-green-400' : 'text-white/60 hover:text-white'}`}
                      title={copied ? "Copied Link!" : "Share Track"}
                    >
                      {copied ? <Check className="w-[18px] h-[18px]" /> : <Share2 className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress + controls */}
              <div
                style={{
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  transitionDelay: isOpen ? "0.28s" : "0s",
                }}
              >
                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-mono text-white/35 w-10 text-right">{formatTime(progress)}</span>
                  <div
                    className="flex-1 relative h-1.5 rounded-full bg-white/10 cursor-pointer group"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      seek(Math.round(ratio * (duration || 0)));
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-pink-400 transition-all duration-300 relative"
                      style={{ width: `${percent}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 translate-x-1/2 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-white/35 w-10">{formatTime(duration)}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button 
                    onClick={toggleShuffle}
                    className={`transition-colors active:scale-90 transform cursor-pointer ${isShuffled ? 'text-primary' : 'text-white/45 hover:text-white/90'}`}
                  >
                    <Shuffle className="w-5 h-5" />
                  </button>

                  <button
                    onClick={prevTrack}
                    className="text-white/45 hover:text-white/90 transition-colors active:scale-90 transform cursor-pointer"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform shadow-2xl shadow-violet-900/50 cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-black text-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black text-black ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={nextTrack}
                    className="text-white/45 hover:text-white/90 transition-colors active:scale-90 transform cursor-pointer"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>

                  <button 
                    onClick={toggleLoop}
                    className={`transition-colors active:scale-90 transform cursor-pointer ${isLooped ? 'text-primary' : 'text-white/45 hover:text-white/90'}`}
                  >
                    <Repeat className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Queue section */}
              {upcomingQueue.length > 0 && (
                <div
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: isOpen ? "translateY(0)" : "translateY(24px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                    transitionDelay: isOpen ? "0.38s" : "0s",
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white/90 tracking-tight">Up Next</h3>
                    <span className="text-xs text-violet-400 font-medium">From Queue ({upcomingQueue.length})</span>
                  </div>
                  <div className="space-y-2 pb-10">
                    {upcomingQueue.map((rec, i) => (
                      <button
                        key={`${rec.id || rec._id}-${i}`}
                        onClick={() => playTrack(rec, queue)}
                        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all duration-200 text-left group cursor-pointer"
                        style={{
                          opacity: isOpen ? 1 : 0,
                          transform: isOpen ? "translateX(0)" : "translateX(-12px)",
                          transition: "opacity 0.4s ease, transform 0.4s ease, background 0.2s ease",
                          transitionDelay: isOpen ? `${0.42 + i * 0.06}s` : "0s",
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/10 border border-white/5">
                          <img
                            src={rec.thumbnail || rec.thumbnail_medium || rec.coverArtUrl || "https://images.unsplash.com/photo-1549046701-6bd11cf71796?w=400&h=400&fit=crop&auto=format"}
                            alt={rec.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white/85 group-hover:text-white truncate transition-colors">
                            {rec.title}
                          </div>
                          <div className="text-xs text-white/40 truncate">
                            {rec.artist} {rec.album ? `· ${rec.album}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-white/25">{formatTime(rec.duration)}</span>
                          <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center text-white/30 group-hover:text-white/70 transition-all">
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
