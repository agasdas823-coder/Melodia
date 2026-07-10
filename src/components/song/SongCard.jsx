import { usePlayer } from '../../context/PlayerContext';

export default function SongCard({ song, queue = [] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const isCurrent = currentTrack && (currentTrack.id === song.id || currentTrack._id === song._id);
  const showPlaying = isCurrent && isPlaying;

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, queue);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className="bg-surface-container rounded-xl p-4 border border-outline-variant/10 hover:border-outline-variant/30 hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all duration-300 group cursor-pointer flex flex-col gap-sm"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-container-highest border border-outline-variant/10">
        {(song.thumbnail || song.thumbnail_medium || song.coverArtUrl) ? (
          <img
            src={song.thumbnail || song.thumbnail_medium || song.coverArtUrl}
            alt={song.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[48px]">album</span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handlePlayClick}
            className="w-12 h-12 rounded-full bg-primary text-surface-container-lowest flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300 hover:bg-primary-fixed-dim"
          >
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {showPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
        </div>

        {/* Playing Badge (visible when playing and not hovered) */}
        {showPlaying && (
          <div className="absolute bottom-2 right-2 bg-primary text-surface-container-lowest rounded-full p-1.5 flex items-center justify-center group-hover:opacity-0 transition-opacity">
            <span className="material-symbols-outlined text-[16px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>
              graphic_eq
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <h4 className="font-label-md text-label-md text-on-background font-semibold truncate group-hover:text-primary transition-colors">
          {song.title}
        </h4>
        <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
          {song.artist}
        </p>
      </div>
    </div>
  );
}
