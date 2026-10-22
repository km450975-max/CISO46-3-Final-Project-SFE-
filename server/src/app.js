import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { registerEventHandlers } from './events/registerHandlers.js';
import { requireBrowserHeader } from './middleware/authenticate.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { sanitizeInput } from './middleware/sanitizeInput.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  registerEventHandlers();
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use(requestLogger);
  app.use('/api/v1', requireBrowserHeader, apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
