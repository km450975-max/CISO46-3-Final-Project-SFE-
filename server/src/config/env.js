import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value || '';
}

const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

function expiryToMs(value) {
  const match = /^(\d+)([dhms])$/.exec(value);
  const units = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 };
  if (!match) return 7 * 86_400_000;
  return Number(match[1]) * units[match[2]];
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn,
  cookieMaxAgeMs: expiryToMs(jwtExpiresIn),
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  bananaApiBaseUrl: process.env.BANANA_API_BASE_URL || 'https://marcconrad.com/uob/banana/api.php',
  bananaApiMode: process.env.BANANA_API_MODE === 'mock' ? 'mock' : 'live',
  bananaApiFallback: process.env.BANANA_API_FALLBACK === 'true',
  bananaApiTimeoutMs: Number(process.env.BANANA_API_TIMEOUT_MS || 8000),
  bananaApiKey: process.env.BANANA_API_KEY || '',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'Administrator',
  trustProxy: process.env.TRUST_PROXY === 'true',
};

export const IMAGE_HOST_ALLOWLIST = new Set([
  'www.sanfoh.com',
  'sanfoh.com',
  'marcconrad.com',
  'www.marcconrad.com',
]);
