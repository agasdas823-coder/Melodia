import { useState } from 'react';
import { ListMusic, Play } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useSyncedLyrics } from '../../hooks/useSyncedLyrics';
import { getTrackTitle, getTrackArtist } from '../../utils/trackMetadata';

export default function MiniLyricsBar() {
  const {
    currentTrack,
    progress,
    lyricsCache,
    setLyricsCache,
    setLyricsOpen,
  } = usePlayer();

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const trackId = currentTrack?.id || currentTrack?._id;
  const cachedLyrics = trackId ? lyricsCache[trackId] : null;

  const { parsedLyrics, activeLyric } = useSyncedLyrics(cachedLyrics, progress);

  const currentLine = activeLyric?.text?.trim();
  const hasLyrics = parsedLyrics.length > 0 && !!currentLine;


  if (!currentTrack || !trackId) return null;

  const statusText = loading
    ? 'Loading lyrics…'
    : fetchError
      ? 'Lyrics unavailable'
      : hasLyrics
        ? currentLine
        : 'Tap to load lyrics';

  return (
    <button
      type="button"
      onClick={() => setLyricsOpen(true)}
      className="fixed left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 rounded-3xl border border-white/10 bg-[#10111d]/95 px-4 py-3 text-left shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/30 md:bottom-6 bottom-24"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <ListMusic className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{statusText}</p>
          <p className="text-[11px] text-white/50 truncate">
            {currentTrack.title} · {currentTrack.artist || currentTrack.artists?.[0]?.name || 'Unknown Artist'}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-white/80">
          <Play className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}
