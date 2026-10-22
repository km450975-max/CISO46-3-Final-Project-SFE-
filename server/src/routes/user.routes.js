import { Router } from 'express';
import { history, me, stats, updateMe, updatePassword } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { pageSchema, passwordSchema, profileSchema } from '../validators/schemas.js';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/me/history', validate(pageSchema), history);
userRouter.get('/me/stats', stats);
userRouter.patch('/me/password', validate(passwordSchema), updatePassword);
userRouter.get('/me', me);
userRouter.patch('/me', validate(profileSchema), updateMe);
