import { usePlayer } from "../context/PlayerContext";
import { Clock, Play, Pause, Trash2 } from "lucide-react";
import AddToPlaylistDropdown from "../components/playlist/AddToPlaylistDropdown";

export default function Recents() {
  const { currentTrack, isPlaying, playTrack, togglePlay, recentTracks, clearRecents, setNowPlayingOpen, setPreviewTrack } = usePlayer();

  const handleRowClick = (song) => {
    const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
    if (isCurrent) {
      if (!isPlaying) togglePlay();
    } else {
      playTrack(song, recentTracks);
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
          <h1 className="text-2xl font-black text-white mb-2">Recently Played</h1>
          <p className="text-sm text-muted-foreground">Your listening history on Melodia.</p>
        </div>

        {recentTracks.length > 0 && (
          <button
            onClick={clearRecents}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-950/20 border border-red-500/20 hover:bg-red-900/25 text-red-200 text-xs font-bold transition-all cursor-pointer w-fit"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* Content */}
      <section className="space-y-3">
        {recentTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-card/20">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-base font-bold text-white mb-1">Your history is empty</p>
            <p className="text-xs text-muted-foreground max-w-xs">Play some music to see your recently played songs here.</p>
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

            {recentTracks.map((song, i) => {
              const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
              const showPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={`${song.id || song._id}-${i}`}
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
                  <div className="flex items-center gap-3 shrink-0 select-none">
                    <div className="md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <AddToPlaylistDropdown song={song} />
                    </div>
                    <span className="text-xs text-muted-foreground font-mono w-12 text-right">{formatDuration(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
