import { Request, Response } from "express";
import { profileService } from "../services/profileService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const profileController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { nickname, avatar } = req.body;
    const profile = await profileService.setupProfile(userId, nickname, avatar);
    res.status(201).json(profile);
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.getById(req.params.id);
    res.json(profile);
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.update(userId, req.body);
    res.json(profile);
  }),

  setStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const profile = await profileService.setStatus(userId, req.body.status);
    res.json(profile);
  }),

  sendFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const result = await profileService.sendFriendRequest(userId, req.body.friendCode);
    res.json(result);
  }),

  acceptFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.acceptFriendRequest(userId, req.body.fromId);
    res.json({ success: true });
  }),

  rejectFriendRequest: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.rejectFriendRequest(userId, req.body.fromId);
    res.json({ success: true });
  }),

  removeFriend: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await profileService.removeFriend(userId, req.params.friendId);
    res.json({ success: true });
  }),

  getFriends: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const friends = await profileService.getFriends(userId);
    res.json(friends);
  }),
};
