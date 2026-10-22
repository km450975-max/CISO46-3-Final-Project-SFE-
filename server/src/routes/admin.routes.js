import { Router } from 'express';
import { activity, health, stats, updateUser, users } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { adminUserSchema, pageSchema } from '../validators/schemas.js';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));
adminRouter.get('/stats', stats);
adminRouter.get('/health', health);
adminRouter.get('/users', validate(pageSchema), users);
adminRouter.patch('/users/:id', validate(adminUserSchema), updateUser);
adminRouter.get('/activity', validate(pageSchema), activity);
