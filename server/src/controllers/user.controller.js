import { asyncHandler } from '../utils/asyncHandler.js';
import { setAuthCookie, signToken } from '../middleware/authenticate.js';
import { changePassword, getHistory, getProfile, getStats, updateProfile } from '../services/user.service.js';

export const me = asyncHandler(async (req, res) => {
  const data = await getProfile(req.user);
  res.json({ success: true, data });
});

export const updateMe = asyncHandler(async (req, res) => {
  const data = await updateProfile(req.user, req.validated.body);
  res.json({ success: true, data });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const tokenUser = await changePassword(req.user, req.validated.body);
  setAuthCookie(res, signToken(tokenUser));
  const data = await getProfile(tokenUser);
  res.json({ success: true, data });
});

export const history = asyncHandler(async (req, res) => {
  const data = await getHistory(req.user, req.validated.query);
  res.json({ success: true, data });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await getStats(req.user);
  res.json({ success: true, data });
});
