import rateLimit from 'express-rate-limit';

function buildLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message },
    },
  });
}

export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Too many sign-in attempts. Please wait and try again.',
});

export const submitLimiter = buildLimiter({
  windowMs: 60 * 1000,
  limit: 40,
  message: 'Too many answer submissions. Please slow down.',
});
