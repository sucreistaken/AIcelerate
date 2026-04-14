import { Response } from "express";
import { roomService, getRoomTemplates } from "../services/roomService";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const roomController = {
  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, description, iconColor, tags, university, isPublic, templateId } = req.body;
    const room = await roomService.create(name, description, userId, iconColor, {
      tags, university, isPublic, templateId,
    });
    res.status(201).json({ ok: true, room });
  }),

  createSolo: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, topic, templateId, tags } = req.body;
    const room = await roomService.createSolo(name, userId, { topic, templateId, tags });
    res.status(201).json({ ok: true, room });
  }),

  discover: asyncHandler(async (req: AuthRequest, res: Response) => {
    const search = req.query.search as string | undefined;
    const tag = req.query.tag as string | undefined;
    const tags = tag ? tag.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    const rooms = await roomService.discoverServers(search, tags);
    res.json({ ok: true, rooms });
  }),

  getTemplates(_req: AuthRequest, res: Response) {
    res.json({ ok: true, templates: getRoomTemplates() });
  },

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const room = await roomService.getById(req.params.id);
    res.json({ ok: true, room });
  }),

  getByInviteCode: asyncHandler(async (req: AuthRequest, res: Response) => {
    const room = await roomService.getByInviteCode(req.params.code);
    res.json({ ok: true, room });
  }),

  getUserRooms: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const rooms = await roomService.getUserServers(userId);
    res.json({ ok: true, rooms });
  }),

  getUserServers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const rooms = await roomService.getUserServers(userId);
    res.json({ ok: true, rooms });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.update(req.params.id, userId, req.body);
    res.json({ ok: true, room });
  }),

  updateTopic: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.updateTopic(req.params.id, userId, req.body.topic);
    res.json({ ok: true, room });
  }),

  join: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.join(req.params.id, userId);
    res.json({ ok: true, room });
  }),

  joinByInvite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.joinByInvite(req.body.inviteCode, userId);
    res.json({ ok: true, room });
  }),

  leave: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.leave(req.params.id, userId);
    res.json({ ok: true });
  }),

  kick: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.kick(req.params.id, userId, req.body.targetId);
    res.json({ ok: true });
  }),

  delete: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    await roomService.delete(req.params.id, userId);
    res.status(204).end();
  }),

  archive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.archive(req.params.id, userId);
    res.json({ ok: true, room });
  }),

  unarchive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.unarchive(req.params.id, userId);
    res.json({ ok: true, room });
  }),

  transferOwnership: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.transferOwnership(req.params.id, userId, req.body.newOwnerId);
    res.json({ ok: true, room });
  }),

  setMaterial: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.setMaterial(req.params.id, userId, req.body.materialId);
    res.json({ ok: true, room });
  }),

  addCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.addCategory(req.params.id, userId, req.body.name);
    res.json({ ok: true, room });
  }),

  regenerateInvite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const code = await roomService.regenerateInvite(req.params.id, userId);
    res.json({ ok: true, inviteCode: code });
  }),

  getMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    const members = await roomService.getMemberProfiles(req.params.id);
    res.json({ ok: true, members });
  }),
};
