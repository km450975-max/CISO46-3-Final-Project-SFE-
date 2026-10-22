import { asyncHandler } from '../utils/asyncHandler.js';
import { getLeaderboard, getMyLeaderboardEntry } from '../services/leaderboard.service.js';

export const list = asyncHandler(async (req, res) => {
  const data = await getLeaderboard({
    page: req.validated.query.page,
    limit: req.validated.query.limit,
    currentUserId: req.user._id,
  });
  res.json({ success: true, data });
});

export const me = asyncHandler(async (req, res) => {
  const data = await getMyLeaderboardEntry(req.user);
  res.json({ success: true, data });
});
