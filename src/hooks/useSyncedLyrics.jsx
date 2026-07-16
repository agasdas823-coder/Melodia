import { useMemo } from 'react';
import { parseLyrics, getActiveLyricIndex } from '../utils/lyricsParser';

export function useSyncedLyrics(rawLyrics, progress, offsetMs = 0) {
  const parsedLyrics = useMemo(() => {
    if (!rawLyrics || rawLyrics === 'NOT_FOUND') return [];
    if (Array.isArray(rawLyrics)) return rawLyrics;
    return parseLyrics(rawLyrics);
  }, [rawLyrics]);

  const activeLyricIndex = useMemo(() => {
    return getActiveLyricIndex(parsedLyrics, progress, offsetMs);
  }, [parsedLyrics, progress, offsetMs]);

  const activeLyric = activeLyricIndex >= 0 ? parsedLyrics[activeLyricIndex] : null;

  return { parsedLyrics, activeLyricIndex, activeLyric };
}
