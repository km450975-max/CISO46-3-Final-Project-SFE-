/**
 * Scoring rules for Banana Math Puzzle Challenge.
 *
 * The Banana Game API does not provide difficulty, hints, or a scoring endpoint.
 * Difficulty changes the time limit and point values inside this application.
 *
 * A correct answer scores:
 *   base + speed + streak - hint penalty, with a minimum of 1 point.
 *
 * - base: easy 10, medium 20, hard 30
 * - speed: whole seconds remaining × 1 (easy/medium) or × 2 (hard)
 * - streak: 2 points for each correct answer already on the current streak
 *   (the first correct answer in a row has no streak bonus)
 * - hint penalty: 5 points when a hint was used on that round
 *
 * Incorrect answers and expired rounds score 0 and reset the streak.
 * Ranked games add points to the player's career total. Practice games do not.
 * One submission is stored per round. A second submission cannot add points.
 */

export const SCORING_RULES = {
  roundsPerGame: 10,
  streakBonusPerStep: 2,
  hintPenalty: 5,
  minimumCorrectPoints: 1,
  expiryGraceMs: 1000,
  difficulties: {
    easy: { timeLimitSeconds: 60, basePoints: 10, speedPointsPerSecond: 1 },
    medium: { timeLimitSeconds: 45, basePoints: 20, speedPointsPerSecond: 1 },
    hard: { timeLimitSeconds: 30, basePoints: 30, speedPointsPerSecond: 2 },
  },
};

export function getDifficultyRule(difficulty) {
  const rule = SCORING_RULES.difficulties[difficulty];
  if (!rule) {
    throw new Error(`Unknown difficulty "${difficulty}"`);
  }
  return rule;
}

export function calculateScore({ difficulty, remainingSeconds, streakAfterCorrect, hintUsed, correct }) {
  if (!correct) {
    return { points: 0, breakdown: { base: 0, speed: 0, streak: 0, hint: 0 } };
  }

  const rule = getDifficultyRule(difficulty);
  const base = rule.basePoints;
  const speed = Math.max(0, Math.floor(Number(remainingSeconds) || 0)) * rule.speedPointsPerSecond;
  const streak = Math.max(0, Number(streakAfterCorrect) - 1) * SCORING_RULES.streakBonusPerStep;
  const hint = hintUsed ? SCORING_RULES.hintPenalty : 0;
  const points = Math.max(SCORING_RULES.minimumCorrectPoints, base + speed + streak - hint);
  return { points, breakdown: { base, speed, streak, hint } };
}

export function nextStreak(currentStreak, correct) {
  return correct ? Number(currentStreak) + 1 : 0;
}

export const ACHIEVEMENTS = {
  first_steps: {
    title: 'First Steps',
    description: 'Answer your first ranked puzzle correctly.',
  },
  streak_5: {
    title: 'On a Roll',
    description: 'Reach a ranked streak of 5.',
  },
  streak_10: {
    title: 'Unstoppable',
    description: 'Reach a ranked streak of 10.',
  },
  century: {
    title: 'Century',
    description: 'Earn 100 ranked points.',
  },
  dedicated: {
    title: 'Dedicated',
    description: 'Complete 5 ranked games.',
  },
  perfect_game: {
    title: 'Perfect Game',
    description: 'Finish a ranked game with every round correct.',
  },
};
