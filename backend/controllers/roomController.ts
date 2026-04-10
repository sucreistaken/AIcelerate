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
    res.status(201).json(room);
  }),

  createSolo: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, topic, templateId, tags } = req.body;
    const room = await roomService.createSolo(name, userId, { topic, templateId, tags });
    res.status(201).json(room);
  }),

  discover: asyncHandler(async (req: AuthRequest, res: Response) => {
    const search = req.query.search as string | undefined;
    const tag = req.query.tag as string | undefined;
    const tags = tag ? tag.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    const rooms = await roomService.discoverServers(search, tags);
    res.json(rooms);
  }),

  getTemplates(_req: AuthRequest, res: Response) {
    res.json(getRoomTemplates());
  },

  get: asyncHandler(async (req: AuthRequest, res: Response) => {
    const room = await roomService.getById(req.params.id);
    res.json(room);
  }),

  getByInviteCode: asyncHandler(async (req: AuthRequest, res: Response) => {
    const room = await roomService.getByInviteCode(req.params.code);
    res.json(room);
  }),

  getUserRooms: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const rooms = await roomService.getUserServers(userId);
    res.json(rooms);
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.update(req.params.id, userId, req.body);
    res.json(room);
  }),

  updateTopic: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.updateTopic(req.params.id, userId, req.body.topic);
    res.json(room);
  }),

  join: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.join(req.params.id, userId);
    res.json(room);
  }),

  joinByInvite: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.joinByInvite(req.body.inviteCode, userId);
    res.json(room);
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

  archive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.archive(req.params.id, userId);
    res.json(room);
  }),

  unarchive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.unarchive(req.params.id, userId);
    res.json(room);
  }),

  transferOwnership: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.transferOwnership(req.params.id, userId, req.body.newOwnerId);
    res.json(room);
  }),

  setMaterial: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.setMaterial(req.params.id, userId, req.body.materialId);
    res.json(room);
  }),

  addCategory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const room = await roomService.addCategory(req.params.id, userId, req.body.name);
    res.json(room);
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
