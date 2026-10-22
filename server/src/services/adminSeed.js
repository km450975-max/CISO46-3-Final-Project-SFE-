import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export async function ensureAdmin() {
  if (!env.adminEmail || !env.adminPassword) return null;
  const existing = await User.findOne({ email: env.adminEmail });
  if (existing) return existing;

  try {
    const admin = await User.create({
      username: env.adminUsername.toLowerCase(),
      email: env.adminEmail,
      passwordHash: await bcrypt.hash(env.adminPassword, env.bcryptRounds),
      role: 'admin',
      displayName: env.adminDisplayName,
    });
    logger.info(`Seeded administrator ${admin.username}`);
    return admin;
  } catch (error) {
    logger.warn('Administrator seed skipped', error.message);
    return null;
  }
}
