import { ActivityEvent } from '../models/ActivityEvent.js';
import { GameAttempt } from '../models/GameAttempt.js';
import { GameSession } from '../models/GameSession.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { checkBananaHealth } from './banana/bananaService.js';

export async function getAdminStats() {
  const [students, admins, suspended, activeGames, completedGames, attempts, correct] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ accountStatus: 'suspended' }),
    GameSession.countDocuments({ status: 'active' }),
    GameSession.countDocuments({ status: 'completed' }),
    GameAttempt.countDocuments(),
    GameAttempt.countDocuments({ correct: true }),
  ]);

  return {
    students,
    admins,
    suspended,
    activeGames,
    completedGames,
    attempts,
    correctAnswers: correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
  };
}

export async function listUsers({ page, limit }) {
  const total = await User.countDocuments();
  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    users: users.map((user) => ({
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName || user.username,
      role: user.role,
      accountStatus: user.accountStatus,
      totalScore: user.totalScore,
      bestStreak: user.bestStreak,
      gamesPlayed: user.gamesPlayed,
      createdAt: user.createdAt,
    })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function updateUserAccount(actor, userId, changes) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'That user could not be found.');

  if (String(user._id) === String(actor._id) && changes.accountStatus === 'suspended') {
    throw new ApiError(400, 'INVALID_ACTION', 'You cannot suspend your own account.');
  }
  if (String(user._id) === String(actor._id) && changes.role === 'student') {
    throw new ApiError(400, 'INVALID_ACTION', 'You cannot remove your own administrator role.');
  }

  if (user.role === 'admin' && changes.role === 'student') {
    const admins = await User.countDocuments({ role: 'admin', accountStatus: 'active' });
    if (admins <= 1) {
      throw new ApiError(400, 'INVALID_ACTION', 'The last active administrator cannot be demoted.');
    }
  }

  if (changes.role) user.role = changes.role;
  if (changes.accountStatus) user.accountStatus = changes.accountStatus;
  user.tokenVersion += 1;
  await user.save();

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    accountStatus: user.accountStatus,
  };
}

export async function listActivity({ page, limit }) {
  const total = await ActivityEvent.countDocuments();
  const events = await ActivityEvent.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user', 'username displayName');

  return {
    events: events.map((event) => ({
      id: event._id,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt,
      user: event.user
        ? { id: event.user._id, username: event.user.username, displayName: event.user.displayName }
        : null,
    })),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getSystemHealth() {
  const banana = await checkBananaHealth();
  return {
    database: 'connected',
    uptimeSeconds: Math.round(process.uptime()),
    bananaApi: banana,
    eventBus: {
      durable: false,
      note: 'Events run in this Node process and are not kept across a restart.',
    },
  };
}
