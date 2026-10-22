import { User } from '../models/User.js';

export async function rankFor(user) {
  if (!user || user.role !== 'student' || user.accountStatus !== 'active') return null;
  const higher = await User.countDocuments({
    role: 'student',
    accountStatus: 'active',
    $or: [
      { totalScore: { $gt: user.totalScore } },
      { totalScore: user.totalScore, bestStreak: { $gt: user.bestStreak } },
      {
        totalScore: user.totalScore,
        bestStreak: user.bestStreak,
        createdAt: { $lt: user.createdAt },
      },
    ],
  });
  return higher + 1;
}

export async function getLeaderboard({ page, limit, currentUserId }) {
  const filter = { role: 'student', accountStatus: 'active' };
  const total = await User.countDocuments(filter);
  const players = await User.find(filter)
    .sort({ totalScore: -1, bestStreak: -1, createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const start = (page - 1) * limit;
  return {
    players: players.map((player, index) => ({
      rank: start + index + 1,
      id: player._id,
      username: player.username,
      displayName: player.displayName || player.username,
      avatarKey: player.avatarKey,
      totalScore: player.totalScore,
      bestStreak: player.bestStreak,
      gamesPlayed: player.gamesPlayed,
      isCurrentUser: String(player._id) === String(currentUserId),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getMyLeaderboardEntry(user) {
  const rank = await rankFor(user);
  if (!rank) {
    return {
      rank: null,
      entry: null,
      message: 'Administrators are not listed on the student leaderboard.',
    };
  }
  return {
    rank,
    entry: {
      rank,
      id: user._id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarKey: user.avatarKey,
      totalScore: user.totalScore,
      bestStreak: user.bestStreak,
      gamesPlayed: user.gamesPlayed,
      isCurrentUser: true,
    },
  };
}
