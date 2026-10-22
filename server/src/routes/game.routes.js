import { Router } from 'express';
import { active, expire, hint, next, show, start, submit } from '../controllers/game.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { submitLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { sessionParamSchema, startGameSchema, submitSchema } from '../validators/schemas.js';

export const gameRouter = Router();

gameRouter.use(authenticate);
gameRouter.post('/start', validate(startGameSchema), start);
gameRouter.get('/active', active);
gameRouter.get('/:id', validate(sessionParamSchema), show);
gameRouter.post('/:id/submit', submitLimiter, validate(submitSchema), submit);
gameRouter.post('/:id/expire', submitLimiter, validate(sessionParamSchema), expire);
gameRouter.post('/:id/hint', validate(sessionParamSchema), hint);
gameRouter.post('/:id/next', validate(sessionParamSchema), next);
