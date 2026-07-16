import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLyrics, getActiveLyricIndex } from './lyricsParser.js';

test('parseLyrics converts timestamped lines into time-based entries', () => {
  const result = parseLyrics('[00:12.34] Hello\n[00:15.00] World');

  assert.deepEqual(result, [
    { time: 12.34, text: 'Hello' },
    { time: 15, text: 'World' },
  ]);
});

test('getActiveLyricIndex selects the current line based on playback progress', () => {
  const lines = [
    { time: 5, text: 'First line' },
    { time: 10, text: 'Second line' },
    { time: 15, text: 'Third line' },
  ];

  assert.equal(getActiveLyricIndex(lines, 7), 0);
  assert.equal(getActiveLyricIndex(lines, 10), 1);
  assert.equal(getActiveLyricIndex(lines, 20), 2);
});

test('getActiveLyricIndex applies an offset before selecting the current line', () => {
  const lines = [
    { time: 5, text: 'First line' },
    { time: 10, text: 'Second line' },
    { time: 15, text: 'Third line' },
  ];

  assert.equal(getActiveLyricIndex(lines, 9, 1000), 1);
  assert.equal(getActiveLyricIndex(lines, 9, 6000), 2);
});
