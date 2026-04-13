import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { gamificationService } from "../services/gamificationService";

export const addXp = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const { action, amount } = req.body;
  if (!action) {
    return res.status(400).json({ ok: false, error: "action is required" });
  }

  const result = await gamificationService.addXp(req.user!.userId, action, amount);
  res.json({ ok: true, ...result });
});

export const getStats = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const result = await gamificationService.getStats(req.user!.userId);
  res.json({ ok: true, ...result });
});
