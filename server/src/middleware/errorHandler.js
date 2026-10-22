import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  let error = err;
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'value';
    error = new ApiError(409, 'DUPLICATE', `That ${field} is already in use.`);
  }
  if (error?.name === 'CastError') {
    error = new ApiError(400, 'INVALID_ID', 'Invalid identifier');
  }

  const status = error.status || 500;
  const message = error.status
    ? error.message
    : 'Something went wrong. Please try again.';
  if (!error.status) logger.error(err.message || 'Unhandled error');
  else if (status >= 500) logger.warn(error.message);

  res.status(status).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
