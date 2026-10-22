import { Router } from 'express';
import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { gameRouter } from './game.routes.js';
import { leaderboardRouter } from './leaderboard.routes.js';
import { puzzleRouter } from './puzzle.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/games', gameRouter);
apiRouter.use('/puzzles', puzzleRouter);
apiRouter.use('/leaderboard', leaderboardRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/admin', adminRouter);
