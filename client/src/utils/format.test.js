import { describe, expect, it } from 'vitest';
import { formatClock, formatDurationSeconds } from './format.js';

describe('time formatting', () => {
  it('renders a countdown clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(1000)).toBe('0:01');
    expect(formatClock(65000)).toBe('1:05');
  });

  it('renders a game duration', () => {
    expect(formatDurationSeconds(45)).toBe('45s');
    expect(formatDurationSeconds(75)).toBe('1m 15s');
  });
});
