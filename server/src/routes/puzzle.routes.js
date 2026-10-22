import { Router } from 'express';
import { currentPuzzle, image, showPuzzle } from '../controllers/puzzle.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { puzzleParamSchema } from '../validators/schemas.js';

export const puzzleRouter = Router();

puzzleRouter.use(authenticate);
puzzleRouter.get('/new', currentPuzzle);
puzzleRouter.get('/:id/image', image);
puzzleRouter.get('/:id', validate(puzzleParamSchema), showPuzzle);
