import { Request, Response } from "express";
import { profileService } from "../services/profileService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const profileController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { nickname, avatar } = req.body;
    const profile = await profileService.setupProfile(userId, nickname, avatar);
    res.status(201).json({ ok: true, profile });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.getById(req.params.id);
    res.json({ ok: true, profile });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.update(userId, req.body);
    res.json({ ok: true, profile });
  }),

  setStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.setStatus(userId, req.body.status);
    res.json({ ok: true, profile });
  }),

  sendFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await profileService.sendFriendRequest(userId, req.body.friendCode);
    res.json({ ok: true, ...result });
  }),

  acceptFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.acceptFriendRequest(userId, req.body.fromId);
    res.json({ ok: true });
  }),

  rejectFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.rejectFriendRequest(userId, req.body.fromId);
    res.json({ ok: true });
  }),

  removeFriend: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.removeFriend(userId, req.params.friendId);
    res.json({ ok: true });
  }),

  getFriends: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const friends = await profileService.getFriends(userId);
    res.json({ ok: true, friends });
  }),
};
