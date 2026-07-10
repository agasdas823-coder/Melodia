import { usePlayer } from '../../context/PlayerContext';

export default function MiniPlayer() {
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
    toggleShuffle,
    toggleLoop,
    isShuffled,
    isLooped
  } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeekChange = (e) => {
    seek(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-50 glass-panel border-t border-outline-variant/20 px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between gap-md text-on-surface">
      {/* Track Info (Left) */}
      <div className="flex items-center gap-sm min-w-0 flex-1 md:flex-initial">
        <div className="w-12 h-12 bg-surface-container-highest rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/20">
          {(currentTrack.thumbnail || currentTrack.thumbnail_medium || currentTrack.coverArtUrl) ? (
            <img src={currentTrack.thumbnail || currentTrack.thumbnail_medium || currentTrack.coverArtUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">album</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-label-md text-label-md text-on-background font-semibold truncate">
            {currentTrack.title}
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {currentTrack.artist}
          </div>
        </div>
      </div>

      {/* Playback Controls & Seekbar (Center) */}
      <div className="flex flex-col items-center gap-xs flex-grow max-w-xl">
        <div className="flex items-center gap-md">
          <button 
            onClick={toggleShuffle}
            className={`transition-colors cursor-pointer hidden md:block ${isShuffled ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">shuffle</span>
          </button>
          <button
            onClick={prevTrack}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">skip_previous</span>
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary text-surface-container-lowest flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            onClick={nextTrack}
            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">skip_next</span>
          </button>
          <button 
            onClick={toggleLoop}
            className={`transition-colors cursor-pointer hidden md:block ${isLooped ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[20px]">repeat</span>
          </button>
        </div>

        {/* Seekbar */}
        <div className="flex items-center gap-sm w-full font-label-sm text-[12px] text-on-surface-variant">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={progress}
            onChange={handleSeekChange}
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume & Extras (Right) */}
      <div className="hidden md:flex items-center gap-sm w-32 justify-end">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
          {volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    </div>
  );
}
