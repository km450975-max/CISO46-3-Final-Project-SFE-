import { describe, expect, it } from 'vitest';
import { calculateScore, nextStreak } from '../src/services/scoring/rules.js';
import { answersMatch, buildHint } from '../src/utils/answers.js';
import { normalizeBananaPayload, BananaApiError } from '../src/services/banana/liveBanana.js';

describe('scoring rules', () => {
  it('awards no points for an incorrect answer', () => {
    const result = calculateScore({
      difficulty: 'medium',
      remainingSeconds: 20,
      streakAfterCorrect: 0,
      hintUsed: false,
      correct: false,
    });
    expect(result.points).toBe(0);
  });

  it('adds base points, remaining whole seconds, and streak bonus', () => {
    const easy = calculateScore({
      difficulty: 'easy',
      remainingSeconds: 12.9,
      streakAfterCorrect: 1,
      hintUsed: false,
      correct: true,
    });
    expect(easy).toEqual({ points: 22, breakdown: { base: 10, speed: 12, streak: 0, hint: 0 } });

    const chained = calculateScore({
      difficulty: 'easy',
      remainingSeconds: 0,
      streakAfterCorrect: 3,
      hintUsed: false,
      correct: true,
    });
    expect(chained.points).toBe(14);
    expect(chained.breakdown.streak).toBe(4);

    const hard = calculateScore({
      difficulty: 'hard',
      remainingSeconds: 10,
      streakAfterCorrect: 1,
      hintUsed: false,
      correct: true,
    });
    expect(hard.points).toBe(50);
  });

  it('applies the hint penalty', () => {
    const result = calculateScore({
      difficulty: 'easy',
      remainingSeconds: 0,
      streakAfterCorrect: 1,
      hintUsed: true,
      correct: true,
    });
    expect(result.points).toBe(5);
    expect(result.breakdown.hint).toBe(5);
  });

  it('resets the streak after a miss and increments it after a correct answer', () => {
    expect(nextStreak(4, true)).toBe(5);
    expect(nextStreak(4, false)).toBe(0);
  });
});

describe('answer checking and hints', () => {
  it('accepts an equivalent integer and rejects anything else', () => {
    expect(answersMatch(' 6 ', 6)).toBe(true);
    expect(answersMatch(0, 0)).toBe(true);
    expect(answersMatch('6.0', 6)).toBe(false);
    expect(answersMatch('banana', 6)).toBe(false);
    expect(answersMatch('', 6)).toBe(false);
  });

  it('does not include the solution in the hint', () => {
    for (const solution of [0, 1, 2, 5, 6, 11, 18]) {
      const hint = buildHint(solution);
      expect(hint).not.toMatch(new RegExp(`(^|\\D)${Math.abs(solution)}(\\D|$)`));
    }
  });
});

describe('Banana API payload adapter', () => {
  it('normalizes the documented JSON shape', () => {
    const puzzle = normalizeBananaPayload({
      question: 'https://www.sanfoh.com/uob/banana/data/example.png',
      solution: '6',
    });
    expect(puzzle).toMatchObject({
      source: 'banana-api',
      solution: 6,
      imageUrl: 'https://www.sanfoh.com/uob/banana/data/example.png',
    });
  });

  it('rejects a payload that cannot be graded', () => {
    expect(() => normalizeBananaPayload({ question: 'https://www.sanfoh.com/uob/banana/data/example.png' })).toThrow(BananaApiError);
    expect(() => normalizeBananaPayload({
      question: 'https://evil.example/puzzle.png',
      solution: 4,
    })).toThrow(BananaApiError);
    expect(() => normalizeBananaPayload('not-json')).toThrow(BananaApiError);
  });
});
