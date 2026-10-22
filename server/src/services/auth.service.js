import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { eventBus } from '../events/eventBus.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { getProfile } from './user.service.js';

async function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

export async function registerUser({ username, email, password }) {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    throw new ApiError(409, 'DUPLICATE', `That ${field} is already registered.`);
  }

  const user = await User.create({
    username,
    email,
    passwordHash: await hashPassword(password),
    displayName: username,
    role: 'student',
  });

  await eventBus.dispatch('user.registered', {
    userId: user._id,
    user,
    message: `Registered ${user.username}`,
  });

  const profile = await getProfile(user);
  return { user: profile.user, tokenUser: user };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
  }

  await eventBus.dispatch('user.logged_in', {
    userId: user._id,
    user,
    message: `Logged in ${user.username}`,
  });

  const profile = await getProfile(user);
  return { user: profile.user, tokenUser: user };
}

export async function logoutUser(user) {
  user.tokenVersion += 1;
  await user.save();
}
