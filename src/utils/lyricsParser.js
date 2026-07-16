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

export function getActiveLyricIndex(lines, progress, offsetMs = 0) {
  if (!lines.length) return -1;

  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const adjustedTime = safeProgress + offsetMs / 1000;

  const timestampedLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (typeof line.time === 'number' && line.time !== null) {
      timestampedLines.push({ time: line.time, index: i });
    }
  }

  if (!timestampedLines.length) {
    return 0;
  }

  if (adjustedTime < timestampedLines[0].time) {
    return 0;
  }

  let left = 0;
  let right = timestampedLines.length - 1;
  let bestMatch = 0;

  while (left <= right) {
    const mid = (left + right) >> 1;
    const candidate = timestampedLines[mid];

    if (candidate.time <= adjustedTime) {
      bestMatch = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return timestampedLines[bestMatch].index;
}
