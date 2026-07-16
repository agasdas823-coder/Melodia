import { useEffect, useState, useRef, useCallback } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { lyricsService } from '../../services/apiService';
import { useSyncedLyrics } from '../../hooks/useSyncedLyrics';
import { getTrackTitle, getTrackArtist } from '../../utils/trackMetadata';

export default function LyricsModal() {
  const { currentTrack, lyricsOpen, setLyricsOpen, isPlaying, usingFallback, lyricsCache, progress, seek, lyricsSyncOffsetMs } = usePlayer();

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedId, setLastFetchedId] = useState(null);
  const lyricsRef = useRef(null);

  const { parsedLyrics, activeLyricIndex } = useSyncedLyrics(lyrics, progress, lyricsSyncOffsetMs);

  const loadLyrics = useCallback(async (force = false) => {
    if (!lyricsOpen || !currentTrack) return;
    const id = currentTrack.id || currentTrack._id;
    if (!force && id === lastFetchedId && (lyrics || error)) return;

    setLoading(true);
    setError(null);
    setLyrics(null);
    setLastFetchedId(id);

    if (!force && lyricsCache[id]) {
      if (lyricsCache[id] === "NOT_FOUND") {
        setError('no_lyrics');
      } else {
        setLyrics(lyricsCache[id]);
      }
      setLoading(false);
      return;
    }

    const title = getTrackTitle(currentTrack);
    const artist = getTrackArtist(currentTrack);

    try {
      const response = await lyricsService.getLyrics(title, artist);
      const data = response.data;
      if (data.success && data.lyrics) {
        setLyrics(data.lyrics.trim());
      } else {
        setError('no_lyrics');
      }
    } catch (fetchError) {
      console.error('Error fetching lyrics:', fetchError);
      setError('fetch_error');
    } finally {
      setLoading(false);
    }
  }, [lyricsOpen, currentTrack, lyricsCache, lastFetchedId, lyrics, error]);

  useEffect(() => {
    loadLyrics(false);
  }, [lyricsOpen, currentTrack, lyricsCache, loadLyrics]);

  const refreshLyrics = async () => {
    if (!currentTrack) return;
    setRefreshing(true);
    await loadLyrics(true);
    setRefreshing(false);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLyricsOpen(false); };
    if (lyricsOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lyricsOpen, setLyricsOpen]);

  useEffect(() => {
    if (!lyricsOpen || activeLyricIndex < 0 || !lyricsRef.current) return;

    const target = lyricsRef.current.querySelector(`[data-lyric-index="${activeLyricIndex}"]`);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeLyricIndex, lyricsOpen]);

  if (!currentTrack) return null;

  return (
    <div
      className={`fixed left-1/2 bottom-24 z-[70] w-[min(96vw,42rem)] max-h-[52vh] -translate-x-1/2 rounded-3xl border border-white/10 bg-[#11121f]/95 shadow-2xl shadow-black/40 transition-all duration-500 backdrop-blur-xl ${
        lyricsOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      role="dialog"
      aria-label="Lyrics"
    >
      <div
        className="relative flex max-h-[52vh] flex-col overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(160deg, rgba(15,15,28,0.96) 0%, rgba(12,12,23,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-base">lyrics</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/70">Lyrics</p>
            <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
            <p className="truncate text-[11px] text-white/50">{currentTrack.artist || 'Unknown Artist'}</p>
          </div>
          <button
            onClick={refreshLyrics}
            disabled={loading}
            className="ml-auto rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Refresh lyrics"
          >
            <span className={`material-symbols-outlined text-white text-base ${refreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
          <button
            onClick={() => setLyricsOpen(false)}
            className="ml-2 rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors"
            aria-label="Close lyrics"
          >
            <span className="material-symbols-outlined text-white text-base">close</span>
          </button>
        </div>

        <div
          ref={lyricsRef}
          className="flex-1 overflow-y-auto px-5 py-4 hide-scrollbar"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <span className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin block" />
                <span
                  className="material-symbols-outlined text-primary text-xl absolute inset-0 flex items-center justify-center"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mic
                </span>
              </div>
              <p className="text-on-surface-variant text-sm">Fetching lyrics…</p>
            </div>
          )}

          {!loading && error === 'no_lyrics' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">lyrics</span>
              <p className="text-on-surface-variant text-base font-medium">No lyrics found</p>
              <p className="text-on-surface-variant/60 text-sm max-w-xs">
                We couldn't find lyrics for "{currentTrack.title}". Try a different song.
              </p>
            </div>
          )}

          {!loading && error === 'fetch_error' && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <span className="material-symbols-outlined text-5xl text-error/40">wifi_off</span>
              <p className="text-error/80 text-base font-medium">Couldn't load lyrics</p>
              <p className="text-on-surface-variant/60 text-sm">Check your connection and try again.</p>
            </div>
          )}

          {!loading && parsedLyrics.length > 0 && (
            <div className="pb-8">
              {parsedLyrics.map((line, i) => {
                const isActive = i === activeLyricIndex;
                const hasText = !!line.text?.trim();
                const isSeekable = hasText && line.time !== null;

                return (
                  <p
                    key={`${line.text || 'blank'}-${i}`}
                    data-lyric-index={i}
                    onClick={() => {
                      if (isSeekable) seek(line.time);
                    }}
                    className={`leading-relaxed transition-all duration-300 ${
                      !hasText
                        ? 'mb-5 h-4'
                        : isActive
                          ? 'text-white text-lg md:text-xl font-semibold mb-3'
                          : `text-white/55 text-base md:text-lg font-medium mb-1 ${isSeekable ? 'hover:text-white/80 cursor-pointer' : 'cursor-default'}`
                    }`}
                    role={isSeekable ? 'button' : undefined}
                    tabIndex={isSeekable ? 0 : undefined}
                  >
                    {hasText ? line.text : '\u00A0'}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
