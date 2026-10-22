import { Puzzle } from '../models/Puzzle.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { getOrDescribeCurrentPuzzle, userCanViewPuzzle } from '../services/game.service.js';
import { sendPuzzleImage } from '../services/puzzleImage.js';

export const currentPuzzle = asyncHandler(async (req, res) => {
  const data = await getOrDescribeCurrentPuzzle(req.user);
  res.json({ success: true, data });
});

export const showPuzzle = asyncHandler(async (req, res) => {
  const puzzle = await Puzzle.findById(req.validated.params.id);
  if (!puzzle) throw new ApiError(404, 'PUZZLE_NOT_FOUND', 'That puzzle could not be found.');
  const allowed = await userCanViewPuzzle(req.user, puzzle._id);
  if (!allowed) throw new ApiError(404, 'PUZZLE_NOT_FOUND', 'That puzzle could not be found.');
  res.json({
    success: true,
    data: {
      puzzle: {
        id: puzzle._id,
        source: puzzle.source,
        fallback: puzzle.fallback,
        simulated: puzzle.source === 'mock',
        imagePath: `/api/v1/puzzles/${puzzle._id}/image`,
      },
    },
  });
});

export const image = asyncHandler(async (req, res) => {
  const puzzle = await Puzzle.findById(req.params.id);
  if (!puzzle) throw new ApiError(404, 'PUZZLE_NOT_FOUND', 'That puzzle could not be found.');
  const allowed = await userCanViewPuzzle(req.user, puzzle._id);
  if (!allowed) throw new ApiError(404, 'PUZZLE_NOT_FOUND', 'That puzzle could not be found.');
  await sendPuzzleImage(puzzle, res);
});
