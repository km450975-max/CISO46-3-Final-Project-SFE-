import { asyncHandler } from '../utils/asyncHandler.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../middleware/authenticate.js';
import { loginUser, logoutUser, registerUser } from '../services/auth.service.js';
import { getProfile } from '../services/user.service.js';

function sendAuth(res, status, result) {
  setAuthCookie(res, signToken(result.tokenUser));
  res.status(status).json({ success: true, data: { user: result.user } });
}

export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.validated.body);
  sendAuth(res, 201, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.validated.body);
  sendAuth(res, 200, result);
});

export const logout = asyncHandler(async (req, res) => {
  await logoutUser(req.user);
  clearAuthCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
});

export const me = asyncHandler(async (req, res) => {
  const profile = await getProfile(req.user);
  res.json({ success: true, data: profile });
});
