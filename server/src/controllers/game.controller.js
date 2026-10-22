import { asyncHandler } from '../utils/asyncHandler.js';
import {
  expireRound,
  getActiveGame,
  getGame,
  nextPuzzle,
  requestHint,
  startGame,
  submitAnswer,
} from '../services/game.service.js';

export const start = asyncHandler(async (req, res) => {
  const { created, ...data } = await startGame(req.user, req.validated.body);
  res.status(created ? 201 : 200).json({ success: true, data });
});

export const active = asyncHandler(async (req, res) => {
  const data = await getActiveGame(req.user);
  res.json({ success: true, data });
});

export const show = asyncHandler(async (req, res) => {
  const data = await getGame(req.user, req.validated.params.id);
  res.json({ success: true, data });
});

export const submit = asyncHandler(async (req, res) => {
  const data = await submitAnswer(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data });
});

export const expire = asyncHandler(async (req, res) => {
  const data = await expireRound(req.user, req.validated.params.id);
  res.json({ success: true, data });
});

export const hint = asyncHandler(async (req, res) => {
  const data = await requestHint(req.user, req.validated.params.id);
  res.json({ success: true, data });
});

export const next = asyncHandler(async (req, res) => {
  const data = await nextPuzzle(req.user, req.validated.params.id);
  res.json({ success: true, data });
});
