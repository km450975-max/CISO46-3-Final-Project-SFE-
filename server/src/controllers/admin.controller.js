import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getAdminStats,
  getSystemHealth,
  listActivity,
  listUsers,
  updateUserAccount,
} from '../services/admin.service.js';

export const stats = asyncHandler(async (req, res) => {
  const data = await getAdminStats();
  res.json({ success: true, data });
});

export const users = asyncHandler(async (req, res) => {
  const data = await listUsers(req.validated.query);
  res.json({ success: true, data });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = await updateUserAccount(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data });
});

export const activity = asyncHandler(async (req, res) => {
  const data = await listActivity(req.validated.query);
  res.json({ success: true, data });
});

export const health = asyncHandler(async (req, res) => {
  const data = await getSystemHealth();
  res.json({ success: true, data });
});
