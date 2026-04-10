import { Response } from "express";
import { roomService, getRoomTemplates } from "../services/roomService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

// Server controller now delegates to unified roomService
export const serverController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, description, iconColor, tags, university, isPublic, templateId } = req.body;
    const server = await roomService.create(name, description, userId, iconColor, {
      tags, university, isPublic, templateId,
    });
    res.status(201).json(server);
  }),

  discover: asyncHandler(async (req: AuthRequest, res: Response) => {
    const search = req.query.search as string | undefined;
    const tag = req.query.tag as string | undefined;
    const tags = tag ? tag.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    const servers = await roomService.discoverServers(search, tags);
    res.json(servers);
  }),

  getTemplates(_req: AuthRequest, res: Response) {
    res.json(getRoomTemplates());
  },

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const server = await roomService.getById(req.params.id);
    res.json(server);
  }),

  getByInviteCode: asyncHandler(async (req: AuthRequest, res: Response) => {
    const server = await roomService.getByInviteCode(req.params.code);
    res.json(server);
  }),

  getUserServers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const servers = await roomService.getUserServers(userId);
    res.json(servers);
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const server = await roomService.update(req.params.id, userId, req.body);
    res.json(server);
  }),

  join: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const server = await roomService.join(req.params.id, userId);
    res.json(server);
  }),

  joinByInvite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const server = await roomService.joinByInvite(req.body.inviteCode, userId);
    res.json(server);
  }),

  leave: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.leave(req.params.id, userId);
    res.json({ success: true });
  }),

  kick: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.kick(req.params.id, userId, req.body.targetId);
    res.json({ success: true });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.delete(req.params.id, userId);
    res.json({ success: true });
  }),

  addCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const server = await roomService.addCategory(req.params.id, userId, req.body.name);
    res.json(server);
  }),

  regenerateInvite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const code = await roomService.regenerateInvite(req.params.id, userId);
    res.json({ inviteCode: code });
  }),

  getMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const members = await roomService.getMemberProfiles(req.params.id);
    res.json(members);
  }),
};

// Re-export for backward compatibility
export const getServerTemplates = getRoomTemplates;
