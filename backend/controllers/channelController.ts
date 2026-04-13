import { Response } from "express";
import { channelService } from "../services/channelService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const channelController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { categoryId, name, type, toolType, lessonId, lessonTitle } = req.body;
    const channel = await channelService.createForServer(
      req.params.serverId, userId, categoryId, name, type, toolType, lessonId, lessonTitle
    );
    res.status(201).json({ ok: true, channel });
  }),

  getByServer: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channels = await channelService.getByServer(req.params.serverId);
    res.json({ ok: true, channels });
  }),

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const channel = await channelService.getById(req.params.serverId, req.params.channelId);
    res.json({ ok: true, channel });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const channel = await channelService.update(
      req.params.serverId, req.params.channelId, userId, req.body
    );
    res.json({ ok: true, channel });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await channelService.delete(req.params.serverId, req.params.channelId, userId);
    res.status(204).end();
  }),
};
