import { eventBus } from '../events/eventBus.js';
import { GameAttempt } from '../models/GameAttempt.js';
import { GameSession } from '../models/GameSession.js';
import { Puzzle } from '../models/Puzzle.js';
import { ApiError } from '../utils/ApiError.js';
import { answersMatch, buildHint } from '../utils/answers.js';
import { serializeAttempt, serializeGame, serializePuzzle } from '../utils/serializers.js';
import { fetchBananaPuzzle } from './banana/bananaService.js';
import { calculateScore, getDifficultyRule, nextStreak, SCORING_RULES } from './scoring/rules.js';

async function storePuzzle(drawn) {
  const existing = await Puzzle.findOne({ externalId: drawn.externalId });
  if (existing) return existing;
  try {
    return await Puzzle.create({
      externalId: drawn.externalId,
      imageUrl: drawn.imageUrl,
      solution: drawn.solution,
      source: drawn.source,
      fallback: Boolean(drawn.fallback),
      active: true,
    });
  } catch (error) {
    if (error.code === 11000) {
      return Puzzle.findOne({ externalId: drawn.externalId });
    }
    throw error;
  }
}

async function usedExternalIds(session) {
  const attempts = await GameAttempt.find({ session: session._id }).select('puzzle');
  const ids = attempts.map((attempt) => attempt.puzzle);
  if (session.currentPuzzle) ids.push(session.currentPuzzle);
  if (!ids.length) return [];
  const puzzles = await Puzzle.find({ _id: { $in: ids } }).select('externalId');
  return puzzles.map((puzzle) => puzzle.externalId);
}

async function drawPuzzle(exclude) {
  const blocked = new Set(exclude);
  let drawn = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    drawn = await fetchBananaPuzzle();
    if (!blocked.has(drawn.externalId)) break;
  }
  return storePuzzle(drawn);
}

function attachRound(session, puzzle) {
  const rule = getDifficultyRule(session.difficulty);
  const started = new Date();
  session.currentPuzzle = puzzle._id;
  session.roundStartedAt = started;
  session.roundEndsAt = new Date(started.getTime() + rule.timeLimitSeconds * 1000);
  session.hintUsed = false;
  session.hintText = '';
}

async function loadOwned(user, sessionId) {
  const session = await GameSession.findById(sessionId);
  if (!session || String(session.user) !== String(user._id)) {
    throw new ApiError(404, 'GAME_NOT_FOUND', 'That game could not be found.');
  }
  return session;
}

export async function presentSession(session) {
  const now = new Date();
  const attempts = await GameAttempt.find({ session: session._id }).sort({ roundNumber: 1 });
  const puzzleIds = attempts.map((attempt) => attempt.puzzle);
  if (session.currentPuzzle) puzzleIds.push(session.currentPuzzle);
  const puzzles = await Puzzle.find({ _id: { $in: puzzleIds } });
  const byId = new Map(puzzles.map((puzzle) => [String(puzzle._id), puzzle]));
  const current = session.currentPuzzle ? byId.get(String(session.currentPuzzle)) : null;
  const currentAttempt = attempts.find((attempt) => attempt.roundNumber === session.currentRound) || null;

  return {
    game: serializeGame(session, now),
    puzzle: current ? serializePuzzle(current) : null,
    attempt: currentAttempt && current ? serializeAttempt(currentAttempt, current.solution) : null,
    rounds: attempts.map((attempt) => {
      const puzzle = byId.get(String(attempt.puzzle));
      return {
        ...serializeAttempt(attempt, puzzle ? puzzle.solution : null),
        puzzle: puzzle ? serializePuzzle(puzzle) : null,
      };
    }),
  };
}

async function openRound(session, user) {
  const puzzle = await drawPuzzle(session._id ? await usedExternalIds(session) : []);
  attachRound(session, puzzle);
  await session.save();
  await eventBus.dispatch('puzzle.loaded', {
    userId: user._id,
    user,
    message: `Loaded round ${session.currentRound} (${session.difficulty}, ${session.mode})`,
  });
  return puzzle;
}

export async function startGame(user, { difficulty, mode, restart }) {
  const existing = await GameSession.findOne({ user: user._id, status: 'active' });
  if (existing && !restart) {
    return { created: false, ...(await presentSession(existing)) };
  }
  if (existing && restart) {
    existing.status = 'abandoned';
    existing.endedAt = new Date();
    await existing.save();
  }

  const session = new GameSession({
    user: user._id,
    mode,
    difficulty,
    currentRound: 1,
    totalRounds: SCORING_RULES.roundsPerGame,
    currentStreak: mode === 'ranked' ? user.currentStreak : 0,
    bestStreak: mode === 'ranked' ? user.currentStreak : 0,
    status: 'active',
    startedAt: new Date(),
  });

  const puzzle = await drawPuzzle([]);
  attachRound(session, puzzle);
  try {
    await session.save();
  } catch (error) {
    if (error.code === 11000) {
      const current = await GameSession.findOne({ user: user._id, status: 'active' });
      if (current) return { created: false, ...(await presentSession(current)) };
    }
    throw error;
  }

  await eventBus.dispatch('puzzle.loaded', {
    userId: user._id,
    user,
    message: `Loaded round 1 (${difficulty}, ${mode})`,
  });

  return { created: true, ...(await presentSession(session)) };
}

export async function getActiveGame(user) {
  const session = await GameSession.findOne({ user: user._id, status: 'active' });
  if (!session) return { game: null, puzzle: null, attempt: null, rounds: [] };
  return presentSession(session);
}

export async function getGame(user, sessionId) {
  const session = await loadOwned(user, sessionId);
  return presentSession(session);
}

export async function getOrDescribeCurrentPuzzle(user) {
  const session = await GameSession.findOne({ user: user._id, status: 'active' });
  if (!session) {
    throw new ApiError(404, 'NO_ACTIVE_GAME', 'Start a game before requesting a puzzle.');
  }
  if (!session.currentPuzzle) {
    await openRound(session, user);
  }
  const presented = await presentSession(session);
  return presented;
}

export async function submitAnswer(user, sessionId, { answer, expired = false }) {
  const session = await loadOwned(user, sessionId);
  if (session.status !== 'active') {
    throw new ApiError(409, 'GAME_CLOSED', 'This game is no longer active.');
  }
  const puzzle = await Puzzle.findById(session.currentPuzzle);
  if (!puzzle) {
    throw new ApiError(409, 'PUZZLE_MISSING', 'This round does not have a puzzle yet.');
  }

  const existing = await GameAttempt.findOne({ session: session._id, roundNumber: session.currentRound });
  if (existing) {
    throw new ApiError(409, 'DUPLICATE_SUBMISSION', 'This round has already been submitted.');
  }

  const now = new Date();
  const endsAt = new Date(session.roundEndsAt).getTime();
  const timedOut = now.getTime() > endsAt + SCORING_RULES.expiryGraceMs;
  if (expired && !timedOut) {
    throw new ApiError(400, 'ROUND_STILL_OPEN', 'This round still has time remaining.');
  }

  const submittedAnswer = answer === undefined || answer === null ? '' : String(answer).trim();
  const correct = !timedOut && answersMatch(submittedAnswer, puzzle.solution);
  const streakBase = session.mode === 'ranked' ? user.currentStreak : session.currentStreak;
  const newStreak = nextStreak(streakBase, correct);
  const remainingSeconds = Math.max(0, (endsAt - now.getTime()) / 1000);
  const score = calculateScore({
    difficulty: session.difficulty,
    remainingSeconds,
    streakAfterCorrect: newStreak,
    hintUsed: session.hintUsed,
    correct,
  });

  const shared = { unlockedAchievements: [], leaderboardChanged: false };
  const payload = {
    userId: user._id,
    user,
    session,
    puzzle,
    shared,
    isFinalRound: session.currentRound >= session.totalRounds,
    message: timedOut
      ? `Round ${session.currentRound} expired`
      : `Round ${session.currentRound} ${correct ? 'correct' : 'incorrect'}`,
    outcome: {
      submittedAnswer,
      correct,
      timedOut,
      points: score.points,
      breakdown: score.breakdown,
      hintUsed: session.hintUsed,
      newStreak,
      submittedAt: now,
    },
  };

  await eventBus.dispatch('answer.submitted', payload);
  const gradeEvent = timedOut ? 'round.expired' : correct ? 'answer.correct' : 'answer.incorrect';
  await eventBus.dispatch(gradeEvent, payload);
  await eventBus.dispatch('score.updated', {
    ...payload,
    message: `Score for this game is ${session.score}`,
  });
  await eventBus.dispatch('streak.updated', {
    ...payload,
    message: `Streak is ${session.currentStreak}`,
  });
  await eventBus.dispatch('round.completed', {
    ...payload,
    message: payload.isFinalRound
      ? `Completed game with score ${session.score}`
      : `Completed round ${session.currentRound}`,
  });
  if (shared.leaderboardChanged) {
    await eventBus.dispatch('leaderboard.updated', {
      ...payload,
      message: `Career score is ${user.totalScore}`,
    });
  }

  const presented = await presentSession(session);
  return {
    correct,
    timedOut,
    points: score.points,
    breakdown: score.breakdown,
    solution: puzzle.solution,
    streak: newStreak,
    gameCompleted: session.status === 'completed',
    unlockedAchievements: shared.unlockedAchievements,
    ...presented,
  };
}

export async function expireRound(user, sessionId) {
  return submitAnswer(user, sessionId, { expired: true });
}

export async function requestHint(user, sessionId) {
  const session = await loadOwned(user, sessionId);
  if (session.status !== 'active') {
    throw new ApiError(409, 'GAME_CLOSED', 'This game is no longer active.');
  }
  const existing = await GameAttempt.findOne({ session: session._id, roundNumber: session.currentRound });
  if (existing) {
    throw new ApiError(409, 'ROUND_CLOSED', 'A hint is not available after an answer is submitted.');
  }
  if (new Date() > new Date(session.roundEndsAt)) {
    throw new ApiError(409, 'ROUND_EXPIRED', 'This round has expired.');
  }
  if (!session.hintUsed) {
    const puzzle = await Puzzle.findById(session.currentPuzzle);
    if (!puzzle) throw new ApiError(409, 'PUZZLE_MISSING', 'This round does not have a puzzle yet.');
    session.hintUsed = true;
    session.hintText = buildHint(puzzle.solution);
    await session.save();
  }
  const presented = await presentSession(session);
  return { hint: session.hintText, ...presented };
}

export async function nextPuzzle(user, sessionId) {
  const session = await loadOwned(user, sessionId);
  if (session.status === 'completed') {
    return presentSession(session);
  }
  if (session.status !== 'active') {
    throw new ApiError(409, 'GAME_CLOSED', 'This game is no longer active.');
  }
  const existing = await GameAttempt.findOne({ session: session._id, roundNumber: session.currentRound });
  if (!existing) {
    throw new ApiError(400, 'ROUND_OPEN', 'Submit an answer, or wait for the timer, before the next puzzle.');
  }
  if (session.currentRound >= session.totalRounds) {
    return presentSession(session);
  }

  session.currentRound += 1;
  await openRound(session, user);
  return presentSession(session);
}

export async function userCanViewPuzzle(user, puzzleId) {
  if (user.role === 'admin') return true;
  const current = await GameSession.exists({ user: user._id, currentPuzzle: puzzleId });
  if (current) return true;
  const attempted = await GameAttempt.exists({ user: user._id, puzzle: puzzleId });
  return Boolean(attempted);
}
