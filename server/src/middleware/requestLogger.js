import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV === 'test') return;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}
