import crypto from "crypto";
import mongoose from "mongoose";
import { Room, ServerCategory, DEFAULT_ROLES } from "../models/Room";
import { User } from "../models/User";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { badRequest, notFound, forbidden } from "../middleware/errorHandler";
import { eventBus } from "../events/eventBus";
import { getServerTemplates, ServerTemplate } from "./serverTemplates";
import { leanArrayToId } from "../config/mongoose-plugins";
import { roomCache } from "../utils/cache";

export { getServerTemplates as getRoomTemplates };

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

function generateCategoryId(): string {
  return `cat-${crypto.randomUUID()}`;
}

async function uniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  while (await Room.exists({ inviteCode: code })) {
    code = generateInviteCode();
  }
  return code;
}

/** Fields needed for RBAC permission checks — used with .select() */
const PERM_FIELDS = "ownerId memberRoles roles memberIds settings categories";

/** Lean-safe permission check — works with both hydrated docs and plain objects */
function checkPermission(room: { ownerId: string; memberRoles?: Map<string, string[]> | Record<string, string[]>; roles: { id: string; permissions: string[] }[] }, userId: string, permission: string): void {
  if (room.ownerId === userId) return;
  // memberRoles is a Map on hydrated docs, plain object on lean
  const memberRoles = room.memberRoles;
  const userRoleIds: string[] = memberRoles instanceof Map
    ? memberRoles.get(userId) || []
    : (memberRoles as Record<string, string[]>)?.[userId] || [];
  const hasPermission = room.roles.some(
    (r) => userRoleIds.includes(r.id) && r.permissions.includes(permission)
  );
  if (!hasPermission) throw forbidden(`Missing permission: ${permission}`);
}

// ── Service ────────────────────────────────────────────────────────────────────

export const roomService = {
  async create(
    name: string,
    description: string,
    ownerId: string,
    iconColor?: string,
    options?: { tags?: string[]; university?: string; isPublic?: boolean; templateId?: string }
  ) {
    if (!name || name.trim().length < 2) throw badRequest("Room name must be at least 2 characters");

    const ownerExists = await User.exists({ _id: ownerId });
    if (!ownerExists) throw notFound("Owner not found");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const inviteCode = await uniqueInviteCode();

      const template = options?.templateId
        ? getServerTemplates().find((t: ServerTemplate) => t.id === options.templateId)
        : null;

      const categories: ServerCategory[] = template
        ? template.categories.map((tc, i) => ({
          id: generateCategoryId(),
          name: tc.name,
          position: i,
          channelIds: [] as string[],
        }))
        : [
          { id: generateCategoryId(), name: "Genel", position: 0, channelIds: [] as string[] },
          { id: generateCategoryId(), name: "Çalışma", position: 1, channelIds: [] as string[] },
        ];

      const [room] = await Room.create([{
        name: name.trim(),
        description: description?.trim() || "",
        iconColor: iconColor || "#6C5CE7",
        inviteCode,
        ownerId,
        isPublic: options?.isPublic ?? false,
        categories,
        roles: DEFAULT_ROLES,
        memberIds: [ownerId],
        memberRoles: new Map([[ownerId, ["role-owner"]]]),
        settings: { maxMembers: 50, isPublic: options?.isPublic ?? false, defaultRole: "role-member" },
        tags: options?.tags || [],
        university: options?.university,
        memberCount: 1,
        lastActivityAt: new Date(),
      }], { session });

      // Create channels in batch (single insertMany instead of sequential create loop)
      const channelDocs: { roomId: string; categoryId: string; name: string; type: string; toolType?: string }[] = [];
      const catIndexMap: number[] = []; // track which category each channel belongs to

      if (template) {
        for (let catIdx = 0; catIdx < template.categories.length; catIdx++) {
          for (const ch of template.categories[catIdx].channels) {
            channelDocs.push({
              roomId: room._id.toString(),
              categoryId: room.categories[catIdx].id,
              name: ch.name,
              type: ch.type,
              toolType: ch.toolType,
            });
            catIndexMap.push(catIdx);
          }
        }
      } else {
        channelDocs.push(
          { roomId: room._id.toString(), categoryId: room.categories[0].id, name: "genel", type: "text" },
          { roomId: room._id.toString(), categoryId: room.categories[0].id, name: "duyurular", type: "announcement" },
          { roomId: room._id.toString(), categoryId: room.categories[1].id, name: "deep-dive", type: "study-tool", toolType: "deep-dive" },
        );
        catIndexMap.push(0, 0, 1);
      }

      const channels = await Channel.insertMany(channelDocs, { session });
      for (let i = 0; i < channels.length; i++) {
        room.categories[catIndexMap[i]].channelIds.push(channels[i]._id.toString());
      }

      room.markModified("categories");
      await room.save({ session });

      // Add room to owner's User record
      await User.findByIdAndUpdate(ownerId, { $addToSet: { roomIds: room._id.toString() } }, { session });

      await session.commitTransaction();

      eventBus.emit("server:created", { serverId: room._id.toString(), ownerId });

      return room.toJSON();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async createSolo(name: string, ownerId: string, options?: { topic?: string; templateId?: string; tags?: string[] }) {
    return this.create(name, options?.topic || "", ownerId, undefined, {
      tags: options?.tags,
      isPublic: false,
      templateId: options?.templateId,
    });
  },

  async discoverServers(search?: string, tags?: string[]) {
    const filter: Record<string, unknown> = { isPublic: true, archivedAt: { $exists: false } };

    if (search) {
      filter.$text = { $search: search };
    }

    if (tags && tags.length) {
      filter.tags = { $in: tags };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sort: Record<string, any> = search
      ? { score: { $meta: "textScore" }, lastActivityAt: -1 }
      : { lastActivityAt: -1, memberCount: -1 };

    const projection = search ? { score: { $meta: "textScore" } } : {};

    const rooms = await Room.find(filter, projection)
      .sort(sort)
      .limit(50)
      .lean();

    return leanArrayToId(rooms);
  },

  async getById(id: string) {
    return roomCache.getOrSet(`room:${id}`, async () => {
      const doc = await Room.findById(id).lean();
      if (!doc) throw notFound("Room not found");
      return Object.assign({}, doc, { id: String(doc._id), memberIds: doc.memberIds, ownerId: doc.ownerId }) as unknown as { _id: unknown; id: string; memberIds: string[]; ownerId: string; [key: string]: unknown };
    });
  },

  /** Batch fetch rooms by IDs with projection. Returns lean documents. */
  async getByIds(ids: string[], projection?: Record<string, number>) {
    if (ids.length === 0) return [];
    const rooms = await Room.find({ _id: { $in: ids } }, projection).lean();
    return leanArrayToId(rooms);
  },

  async getByInviteCode(code: string) {
    const room = await Room.findOne({ inviteCode: code.toUpperCase() }).lean();
    if (!room) throw notFound("Invalid invite code");
    return { ...room, id: String(room._id) };
  },

  async getUserServers(userId: string) {
    const rooms = await Room.find({ memberIds: userId }).sort({ lastActivityAt: -1 }).lean();
    return leanArrayToId(rooms);
  },

  async update(roomId: string, userId: string, updates: Record<string, unknown>) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, userId, "manage_server");

    const allowed = ["name", "description", "iconColor", "tags", "university", "isPublic", "settings"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const updated = await Room.findByIdAndUpdate(roomId, { $set: safeUpdates }, { returnDocument: 'after' });
    if (!updated) throw notFound("Room not found");
    roomCache.del(`room:${roomId}`);
    return updated.toJSON();
  },

  async updateTopic(roomId: string, userId: string, topic: string) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, userId, "manage_server");
    const updated = await Room.findByIdAndUpdate(roomId, { $set: { description: topic.trim() } }, { returnDocument: 'after' });
    return updated!.toJSON();
  },

  async join(roomId: string, userId: string) {
    const [room, userExists] = await Promise.all([
      Room.findById(roomId).select("memberIds settings").lean(),
      User.exists({ _id: userId }),
    ]);
    if (!room) throw notFound("Room not found");
    if (!userExists) throw notFound("User not found");
    if ((room.memberIds as string[]).includes(userId)) {
      return this.getById(roomId);
    }
    if ((room.memberIds as string[]).length >= (room.settings?.maxMembers || 50)) throw badRequest("Room is full");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { memberIds: userId },
        $set: {
          [`memberRoles.${userId}`]: [room.settings?.defaultRole || "role-member"],
        },
        $inc: { memberCount: 1 },
      }, { session });

      await User.findByIdAndUpdate(userId, { $addToSet: { roomIds: roomId } }, { session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    roomCache.del(`room:${roomId}`);
    eventBus.emit("member:joined", { serverId: roomId, userId });
    return this.getById(roomId);
  },

  async joinByInvite(inviteCode: string, userId: string) {
    const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!room) throw notFound("Invalid invite code");
    return this.join(room._id.toString(), userId);
  },

  async leave(roomId: string, userId: string) {
    const room = await Room.findById(roomId).select("ownerId memberIds").lean();
    if (!room) throw notFound("Room not found");
    if (!(room.memberIds as string[]).includes(userId)) throw badRequest("Not a member");

    // Owner leaving: auto-transfer or delete
    if (room.ownerId === userId) {
      const otherMembers = room.memberIds.filter((id: string) => id !== userId);
      if (otherMembers.length > 0) {
        await this.transferOwnership(roomId, userId, otherMembers[0]);
      } else {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          await Room.findByIdAndDelete(roomId, { session });
          await Channel.deleteMany({ roomId }, { session });
          await User.findByIdAndUpdate(userId, { $pull: { roomIds: roomId } }, { session });
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
        roomCache.del(`room:${roomId}`);
        return;
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Room.findByIdAndUpdate(roomId, {
        $pull: { memberIds: userId },
        $unset: { [`memberRoles.${userId}`]: "" },
        $inc: { memberCount: -1 },
      }, { session });

      await User.findByIdAndUpdate(userId, { $pull: { roomIds: roomId } }, { session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    roomCache.del(`room:${roomId}`);
    eventBus.emit("member:left", { serverId: roomId, userId });
  },

  async kick(roomId: string, requesterId: string, targetId: string) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, requesterId, "kick_members");
    if (targetId === room.ownerId) throw forbidden("Cannot kick the owner");
    if (targetId === requesterId) throw badRequest("Cannot kick yourself");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Room.findByIdAndUpdate(roomId, {
        $pull: { memberIds: targetId },
        $unset: { [`memberRoles.${targetId}`]: "" },
        $inc: { memberCount: -1 },
      }, { session });

      await User.findByIdAndUpdate(targetId, { $pull: { roomIds: roomId } }, { session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    roomCache.del(`room:${roomId}`);
    eventBus.emit("member:left", { serverId: roomId, userId: targetId });
  },

  async delete(roomId: string, userId: string) {
    const room = await Room.findById(roomId).select("ownerId").lean();
    if (!room) throw notFound("Room not found");
    if (room.ownerId !== userId) throw forbidden("Only the owner can delete the room");

    // Collect channel IDs for ToolData cleanup
    const channelIds = (await Channel.find({ roomId }, { _id: 1 }).lean()).map((c) => c._id.toString());

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Remove room from all members' roomIds
      await User.updateMany({ roomIds: roomId }, { $pull: { roomIds: roomId } }, { session });
      // 2. Delete all messages in room
      await Message.deleteMany({ roomId }, { session });
      // 3. Delete tool data for all channels in room
      if (channelIds.length > 0) {
        const { ToolData } = await import("../models/ToolData");
        await ToolData.deleteMany({ channelId: { $in: channelIds } }, { session });
      }
      // 4. Delete materials
      const { Material } = await import("../models/Material");
      await Material.deleteMany({ roomId }, { session });
      // 5. Delete notifications referencing this room
      const { Notification } = await import("../models/Notification");
      await Notification.deleteMany({ roomId }, { session });
      // 6. Delete channels
      await Channel.deleteMany({ roomId }, { session });
      // 7. Delete room
      await Room.findByIdAndDelete(roomId, { session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    roomCache.del(`room:${roomId}`);
    eventBus.emit("server:deleted", { serverId: roomId });
  },

  async archive(roomId: string, userId: string) {
    const updated = await Room.findOneAndUpdate(
      { _id: roomId, ownerId: userId },
      { $set: { archivedAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();
    if (!updated) throw forbidden("Room not found or only the owner can archive");
    return { ...updated, id: String(updated._id) };
  },

  async unarchive(roomId: string, userId: string) {
    const updated = await Room.findOneAndUpdate(
      { _id: roomId, ownerId: userId },
      { $unset: { archivedAt: "" } },
      { returnDocument: 'after' }
    ).lean();
    if (!updated) throw forbidden("Room not found or only the owner can unarchive");
    return { ...updated, id: String(updated._id) };
  },

  async transferOwnership(roomId: string, currentOwnerId: string, newOwnerId: string) {
    const room = await Room.findById(roomId).select("ownerId memberIds").lean();
    if (!room) throw notFound("Room not found");
    if (room.ownerId !== currentOwnerId) throw forbidden("Only the owner can transfer ownership");
    if (!(room.memberIds as string[]).includes(newOwnerId)) throw badRequest("New owner must be a member");

    const updated = await Room.findByIdAndUpdate(roomId, {
      $set: {
        ownerId: newOwnerId,
        [`memberRoles.${newOwnerId}`]: ["role-owner"],
        [`memberRoles.${currentOwnerId}`]: ["role-admin"],
      },
    }, { returnDocument: 'after' });

    return updated!.toJSON();
  },

  async setMaterial(roomId: string, userId: string, materialId: string) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, userId, "manage_server");
    const updated = await Room.findByIdAndUpdate(roomId, { $set: { materialId } }, { returnDocument: 'after' });
    return updated!.toJSON();
  },

  async addCategory(roomId: string, userId: string, name: string) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, userId, "manage_channels");

    const cat: ServerCategory = {
      id: generateCategoryId(),
      name: name.trim(),
      position: room.categories.length,
      channelIds: [] as string[],
    };

    const updated = await Room.findByIdAndUpdate(
      roomId,
      { $push: { categories: cat } },
      { returnDocument: 'after' }
    );

    return updated!.toJSON();
  },

  async regenerateInvite(roomId: string, userId: string) {
    const room = await Room.findById(roomId).select(PERM_FIELDS).lean();
    if (!room) throw notFound("Room not found");
    checkPermission(room, userId, "manage_server");

    const code = await uniqueInviteCode();
    await Room.findByIdAndUpdate(roomId, { $set: { inviteCode: code } });
    return code;
  },

  async getMemberProfiles(roomId: string) {
    const room = await Room.findById(roomId).select("memberIds memberRoles").lean();
    if (!room) throw notFound("Room not found");

    const users = await User.find(
      { _id: { $in: room.memberIds } },
      { "profile.nickname": 1, "profile.avatar": 1, status: 1 }
    ).lean();

    const memberRoles = room.memberRoles as unknown as Record<string, string[]> | undefined;
    return users.map((u) => ({
      id: u._id.toString(),
      nickname: u.profile?.nickname || "Unknown",
      avatar: u.profile?.avatar || "avatar-1",
      status: u.status || "offline",
      roles: memberRoles?.[u._id.toString()] || [],
    }));
  },

  checkPermission,
};
