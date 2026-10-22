import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdmin } from './services/adminSeed.js';
import { logger } from './utils/logger.js';

const app = createApp();

try {
  await connectDB(env.mongoUri);
  await ensureAdmin();
  app.listen(env.port, () => {
    logger.info(`Banana Math API listening on port ${env.port}`);
  });
} catch (error) {
  logger.error('Server failed to start', error.message);
  process.exit(1);
}
