import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), tv: user.tokenVersion },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

export function setAuthCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: env.cookieMaxAgeMs,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('access_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
  });
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = bearer || req.cookies?.access_token;
    if (!token) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session has expired. Please log in again.');
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session is no longer valid. Please log in again.');
    }
    if (user.accountStatus !== 'active') {
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
    }
    if (user.tokenVersion !== decoded.tv) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session is no longer valid. Please log in again.');
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
    }
    next();
  };
}

export function requireBrowserHeader(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new ApiError(403, 'CSRF_REJECTED', 'This request was rejected.'));
  }
  next();
}
