import { Router } from 'express';
import { list, me } from '../controllers/leaderboard.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { pageSchema } from '../validators/schemas.js';

export const leaderboardRouter = Router();

leaderboardRouter.use(authenticate);
leaderboardRouter.get('/me', me);
leaderboardRouter.get('/', validate(pageSchema), list);
