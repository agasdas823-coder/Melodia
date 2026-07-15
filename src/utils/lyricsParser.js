export function parseLyrics(rawLyrics) {
  if (!rawLyrics) return [];

  const lines = String(rawLyrics)
    .replace(/\r/g, '')
    .split('\n');

  const parsed = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const match = trimmed.match(/\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/);
    if (match) {
      const [, min, sec, ms = '0', text = ''] = match;
      const timeInSeconds = Number(min) * 60 + Number(sec) + Number(`0.${ms}`);
      parsed.push({ time: timeInSeconds, text: text.trim() });
    } else {
      parsed.push({ time: null, text: trimmed });
    }
  }

  return parsed;
}

export function getActiveLyricIndex(lines, progress) {
  if (!lines.length) return -1;

  const safeProgress = Number.isFinite(progress) ? progress : 0;
  let activeIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.time === null) {
      continue;
    }

    if (safeProgress < line.time) {
      return Math.max(0, i - 1);
    }

    activeIndex = i;
  }

  return Math.max(0, activeIndex);
}
