import { Request, Response } from "express";
import { messageService } from "../services/messageService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { Room } from "../models/Room";
import { Channel } from "../models/Channel";
import { forbidden, notFound } from "../middleware/errorHandler";

async function verifyMembership(userId: string, channelId: string): Promise<void> {
  const channel = await Channel.findById(channelId);
  if (!channel) throw notFound("Channel not found");
  if (channel.roomId === "global-lobby") return; // Lobby is open
  const room = await Room.findById(channel.roomId);
  if (!room) throw notFound("Room not found");
  if (!room.memberIds.includes(userId)) {
    throw forbidden("Not a member of this server");
  }
}

export const messageController = {
  send: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { content, type, embeds, threadId } = req.body;
    const { channelId } = req.params;
    await verifyMembership(userId, channelId);
    const serverId = req.params.serverId || req.body.serverId;
    const message = await messageService.send(channelId, serverId, userId, content, type, embeds, threadId);
    res.status(201).json({ ok: true, message });
  }),

  getMessages: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await messageService.getMessages(req.params.channelId, limit, before);
    res.json({ ok: true, messages });
  }),

  getThread: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const messages = await messageService.getThread(req.params.channelId, req.params.threadId);
    res.json({ ok: true, messages });
  }),

  edit: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const message = await messageService.edit(
      req.params.channelId, req.params.messageId, userId, req.body.content
    );
    res.json({ ok: true, message });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const isAdmin = req.user!.role === "admin";
    await messageService.delete(
      req.params.channelId, req.params.messageId, userId, isAdmin
    );
    res.json({ ok: true });
  }),

  react: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const message = await messageService.react(
      req.params.channelId, req.params.messageId, req.body.emoji, userId
    );
    res.json({ ok: true, message });
  }),

  pin: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await verifyMembership(userId, req.params.channelId);
    const message = await messageService.pin(
      req.params.channelId, req.body.serverId, req.params.messageId
    );
    res.json({ ok: true, message });
  }),

  // --- Lobby ---
  getLobbyMessages: asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await messageService.getMessages("global-lobby", limit, before);
    res.json({ ok: true, messages });
  }),

  sendLobbyMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { content } = req.body;
    const message = await messageService.sendLobby("global-lobby", userId, content);
    res.status(201).json({ ok: true, message });
  }),
};
