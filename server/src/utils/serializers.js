import { Achievement } from '../models/Achievement.js';
import { ACHIEVEMENTS } from '../services/scoring/rules.js';

export function serializeGame(session, now = new Date()) {
  const ends = session.roundEndsAt ? new Date(session.roundEndsAt).getTime() : null;
  const remainingMs = ends === null ? 0 : Math.max(0, ends - now.getTime());
  return {
    id: session._id,
    mode: session.mode,
    difficulty: session.difficulty,
    basePoints: session.basePoints,
    currentRound: session.currentRound,
    totalRounds: session.totalRounds,
    score: session.score,
    currentStreak: session.currentStreak,
    bestStreak: session.bestStreak,
    correctCount: session.correctCount,
    resolvedRounds: session.resolvedRounds,
    progress: session.totalRounds ? session.resolvedRounds / session.totalRounds : 0,
    status: session.status,
    hintUsed: session.hintUsed,
    hintText: session.hintText || '',
    roundStartedAt: session.roundStartedAt,
    roundEndsAt: session.roundEndsAt,
    serverNow: now,
    remainingMs,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    durationSeconds: Math.max(
      0,
      Math.round(((session.endedAt || now).getTime() - new Date(session.startedAt).getTime()) / 1000),
    ),
  };
}

export function serializePuzzle(puzzle) {
  return {
    id: puzzle._id,
    source: puzzle.source,
    fallback: Boolean(puzzle.fallback),
    simulated: puzzle.source === 'mock',
    imagePath: `/api/v1/puzzles/${puzzle._id}/image`,
  };
}

export function serializeAttempt(attempt, solution) {
  return {
    id: attempt._id,
    roundNumber: attempt.roundNumber,
    submittedAnswer: attempt.submittedAnswer,
    correct: attempt.correct,
    timedOut: attempt.timedOut,
    pointsAwarded: attempt.pointsAwarded,
    breakdown: attempt.breakdown,
    hintUsed: attempt.hintUsed,
    submittedAt: attempt.submittedAt,
    solution,
  };
}

export function serializeAchievements(records) {
  return records.map((record) => ({
    type: record.type,
    title: ACHIEVEMENTS[record.type]?.title || record.type,
    description: ACHIEVEMENTS[record.type]?.description || '',
    awardedAt: record.awardedAt,
  }));
}

export async function loadAchievementViews(userId) {
  const records = await Achievement.find({ user: userId }).sort({ awardedAt: 1 });
  return serializeAchievements(records);
}

export function serializePublicPlayer(user, rank, { email = false } = {}) {
  return {
    id: user._id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatarKey: user.avatarKey,
    totalScore: user.totalScore,
    bestStreak: user.bestStreak,
    currentStreak: user.currentStreak,
    gamesPlayed: user.gamesPlayed,
    puzzlesCompleted: user.puzzlesCompleted,
    rank,
    ...(email ? { email: user.email, role: user.role, accountStatus: user.accountStatus, createdAt: user.createdAt } : {}),
  };
}
