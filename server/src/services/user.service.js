import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { GameAttempt } from '../models/GameAttempt.js';
import { GameSession } from '../models/GameSession.js';
import { Puzzle } from '../models/Puzzle.js';
import { ApiError } from '../utils/ApiError.js';
import { loadAchievementViews, serializeGame, serializePuzzle, serializeAttempt } from '../utils/serializers.js';
import { getLeaderboard, rankFor } from './leaderboard.service.js';

function publicUser(user, rank, achievements) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    role: user.role,
    avatarKey: user.avatarKey,
    theme: user.theme,
    accountStatus: user.accountStatus,
    createdAt: user.createdAt,
    totalScore: user.totalScore,
    currentStreak: user.currentStreak,
    bestStreak: user.bestStreak,
    gamesPlayed: user.gamesPlayed,
    puzzlesCompleted: user.puzzlesCompleted,
    rank,
    achievements,
  };
}

export async function getProfile(user) {
  const [rank, achievements] = await Promise.all([
    rankFor(user),
    loadAchievementViews(user._id),
  ]);
  return { user: publicUser(user, rank, achievements) };
}

export async function updateProfile(user, changes) {
  if (changes.displayName !== undefined) user.displayName = changes.displayName;
  if (changes.avatarKey !== undefined) user.avatarKey = changes.avatarKey;
  if (changes.theme !== undefined) user.theme = changes.theme;
  await user.save();
  return getProfile(user);
}

export async function changePassword(user, { currentPassword, newPassword }) {
  const withHash = await user.constructor.findById(user._id).select('+passwordHash');
  const matches = await bcrypt.compare(currentPassword, withHash.passwordHash);
  if (!matches) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'The current password is incorrect.');
  }
  withHash.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  withHash.tokenVersion += 1;
  await withHash.save();
  user.tokenVersion = withHash.tokenVersion;
  return withHash;
}

export async function getHistory(user, { page, limit }) {
  const filter = { user: user._id };
  const total = await GameSession.countDocuments(filter);
  const sessions = await GameSession.find(filter)
    .sort({ startedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const sessionIds = sessions.map((session) => session._id);
  const attempts = await GameAttempt.find({ session: { $in: sessionIds } }).sort({ roundNumber: 1 });
  const puzzles = await Puzzle.find({ _id: { $in: attempts.map((attempt) => attempt.puzzle) } });
  const puzzleById = new Map(puzzles.map((puzzle) => [String(puzzle._id), puzzle]));

  const games = sessions.map((session) => {
    const rounds = attempts
      .filter((attempt) => String(attempt.session) === String(session._id))
      .map((attempt) => {
        const puzzle = puzzleById.get(String(attempt.puzzle));
        return {
          ...serializeAttempt(attempt, puzzle ? puzzle.solution : null),
          puzzle: puzzle ? serializePuzzle(puzzle) : null,
        };
      });
    return { ...serializeGame(session), rounds };
  });

  return {
    games,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getStats(user) {
  const [profile, attemptCount, correctCount, activeSession, preview] = await Promise.all([
    getProfile(user),
    GameAttempt.countDocuments({ user: user._id }),
    GameAttempt.countDocuments({ user: user._id, correct: true }),
    GameSession.findOne({ user: user._id, status: 'active' }),
    getLeaderboard({ page: 1, limit: 5, currentUserId: user._id }),
  ]);

  let activeGame = null;
  if (activeSession) {
    const puzzle = activeSession.currentPuzzle
      ? await Puzzle.findById(activeSession.currentPuzzle)
      : null;
    activeGame = {
      game: serializeGame(activeSession),
      puzzle: puzzle ? serializePuzzle(puzzle) : null,
    };
  }

  return {
    user: profile.user,
    stats: {
      totalScore: user.totalScore,
      currentStreak: user.currentStreak,
      bestStreak: user.bestStreak,
      gamesPlayed: user.gamesPlayed,
      puzzlesCompleted: user.puzzlesCompleted,
      answersSubmitted: attemptCount,
      correctAnswers: correctCount,
      accuracy: attemptCount ? Math.round((correctCount / attemptCount) * 100) : 0,
      rank: profile.user.rank,
    },
    activeGame,
    leaderboardPreview: preview.players,
  };
}
