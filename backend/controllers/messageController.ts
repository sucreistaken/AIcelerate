import { Request, Response } from "express";
import { messageService } from "../services/messageService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const messageController = {
  send: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { content, type, embeds, threadId } = req.body;
    const { channelId } = req.params;
    const serverId = req.params.serverId || req.body.serverId;
    const message = await messageService.send(channelId, serverId, userId, content, type, embeds, threadId);
    res.status(201).json(message);
  }),

  getMessages: asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await messageService.getMessages(req.params.channelId, limit, before);
    res.json(messages);
  }),

  getThread: asyncHandler(async (req: Request, res: Response) => {
    const messages = await messageService.getThread(req.params.channelId, req.params.threadId);
    res.json(messages);
  }),

  edit: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const message = await messageService.edit(
      req.params.channelId, req.params.messageId, userId, req.body.content
    );
    res.json(message);
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await messageService.delete(
      req.params.channelId, req.params.messageId, userId, req.body.isAdmin
    );
    res.json({ success: true });
  }),

  react: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const message = await messageService.react(
      req.params.channelId, req.params.messageId, req.body.emoji, userId
    );
    res.json(message);
  }),

  pin: asyncHandler(async (req: AuthRequest, res: Response) => {
    const message = await messageService.pin(
      req.params.channelId, req.body.serverId, req.params.messageId
    );
    res.json(message);
  }),

  // --- Lobby ---
  getLobbyMessages: asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await messageService.getMessages("global-lobby", limit, before);
    res.json(messages);
  }),

  sendLobbyMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { content } = req.body;
    const message = await messageService.sendLobby("global-lobby", userId, content);
    res.status(201).json(message);
  }),
};
