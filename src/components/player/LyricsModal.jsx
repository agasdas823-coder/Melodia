import { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';

export default function LyricsModal() {
  const { currentTrack, lyricsOpen, setLyricsOpen, isPlaying, usingFallback, lyricsCache } = usePlayer();

  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedId, setLastFetchedId] = useState(null);
  const lyricsRef = useRef(null);

  // Fetch lyrics whenever the modal opens or track changes
  useEffect(() => {
    if (!lyricsOpen || !currentTrack) return;
    const id = currentTrack.id || currentTrack._id;
    if (id === lastFetchedId) return; // don't re-fetch for same track

    setLoading(true);
    setError(null);
    setLyrics(null);
    setLastFetchedId(id);

    // Check cache first
    if (lyricsCache[id]) {
      if (lyricsCache[id] === "NOT_FOUND") {
        setError('no_lyrics');
      } else {
        setLyrics(lyricsCache[id]);
      }
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5002/api/lyrics?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.lyrics) {
          setLyrics(data.lyrics.trim());
        } else {
          setError('no_lyrics');
        }
      })
      .catch(() => setError('fetch_error'))
      .finally(() => setLoading(false));
  }, [lyricsOpen, currentTrack, lyricsCache, lastFetchedId]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setLyricsOpen(false); };
    if (lyricsOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lyricsOpen, setLyricsOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = lyricsOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [lyricsOpen]);

  if (!currentTrack) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setLyricsOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          lyricsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 w-full z-[70] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          lyricsOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Lyrics"
      >
        {/* Pill handle */}
        <div className="flex justify-center pt-3 pb-1 bg-transparent absolute top-0 left-0 w-full">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div
          className="relative max-h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(25,25,40,0.97) 0%, rgba(20,20,35,0.99) 100%)',
            borderTop: '1px solid rgba(192,193,255,0.12)',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
          }}
        >
          {/* Ambient glow from cover art */}
          {currentTrack.coverArtUrl && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: `radial-gradient(ellipse 80% 40% at 50% 0%, rgba(192,193,255,0.4), transparent)`,
              }}
            />
          )}

          {/* Header */}
          <div className="flex items-center gap-4 px-6 pt-8 pb-4 flex-shrink-0 relative">
            {/* Cover art */}
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-white/10">
              {currentTrack.coverArtUrl ? (
                <img
                  src={currentTrack.coverArtUrl}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-all duration-1000 ${
                    isPlaying ? 'scale-110' : 'scale-100'
                  }`}
                />
              ) : (
                <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">album</span>
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-widest mb-0.5">
                Lyrics
                {usingFallback && <span className="ml-2 text-primary/50 normal-case tracking-normal">· 30s preview</span>}
              </p>
              <h2 className="text-white font-bold text-lg leading-tight truncate">{currentTrack.title}</h2>
              <p className="text-on-surface-variant text-sm truncate">{currentTrack.artist}</p>
            </div>

            {/* Close button */}
            <button
              onClick={() => setLyricsOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close lyrics"
            >
              <span className="material-symbols-outlined text-white text-xl">close</span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5 mx-6 flex-shrink-0" />

          {/* Lyrics content */}
          <div
            ref={lyricsRef}
            className="flex-1 overflow-y-auto px-6 py-6 hide-scrollbar"
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

            {!loading && lyrics && (
              <div className="pb-8">
                {lyrics.split('\n').map((line, i) => (
                  <p
                    key={i}
                    className={`leading-relaxed transition-colors duration-300 ${
                      line.trim() === ''
                        ? 'mb-5'
                        : 'text-white/85 text-base md:text-lg font-medium mb-1 hover:text-white cursor-default'
                    }`}
                  >
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
