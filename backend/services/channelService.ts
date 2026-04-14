import mongoose from "mongoose";
import { Channel } from "../models/Channel";
import { Room } from "../models/Room";
import { Message } from "../models/Message";
import { notFound, forbidden } from "../middleware/errorHandler";
import { leanArrayToId } from "../config/mongoose-plugins";

export const channelService = {
  async create(
    roomId: string,
    categoryId: string,
    name: string,
    type: string,
    toolType?: string,
    lessonId?: string,
    lessonTitle?: string
  ) {
    const channel = await Channel.create({
      roomId,
      categoryId,
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      type,
      ...(toolType && { toolType }),
      ...(lessonId && { lessonId }),
      ...(lessonTitle && { lessonTitle }),
    });
    return channel.toJSON();
  },

  async createForServer(
    roomId: string,
    userId: string,
    categoryId: string,
    name: string,
    type: string,
    toolType?: string,
    lessonId?: string,
    lessonTitle?: string
  ) {
    const room = await Room.findById(roomId).select("ownerId memberRoles roles categories").lean();
    if (!room) throw notFound("Room not found");

    // Check permission (lean-safe)
    if (room.ownerId !== userId) {
      const memberRoles = room.memberRoles as unknown as Record<string, string[]> | undefined;
      const userRoleIds = memberRoles?.[userId] || [];
      const hasPermission = room.roles.some(
        (r) => userRoleIds.includes(r.id) && r.permissions.includes("manage_channels")
      );
      if (!hasPermission) throw forbidden("Missing permission: manage_channels");
    }

    // Validate category exists
    const cat = room.categories.find((c: { id: string }) => c.id === categoryId);
    if (!cat) throw notFound("Category not found");

    const channel = await this.create(roomId, categoryId, name, type, toolType, lessonId, lessonTitle);

    // Add channel to category atomically (no hydration needed)
    await Room.findOneAndUpdate(
      { _id: roomId, "categories.id": categoryId },
      { $push: { "categories.$.channelIds": channel.id } }
    );

    return channel;
  },

  async getByServer(roomId: string) {
    const channels = await Channel.find({ roomId }).sort({ order: 1 }).lean();
    return leanArrayToId(channels).map((ch) => ({ ...ch, serverId: ch.roomId }));
  },

  async getById(roomId: string, channelId: string) {
    const channel = await Channel.findOne({ _id: channelId, roomId }).lean();
    if (!channel) throw notFound("Channel not found");
    return { ...channel, id: String(channel._id), serverId: channel.roomId };
  },

  async getByIdGlobal(channelId: string) {
    const channel = await Channel.findById(channelId).lean();
    if (!channel) throw notFound("Channel not found");
    return { ...channel, id: String(channel._id), serverId: channel.roomId };
  },

  async update(roomId: string, channelId: string, userId: string, updates: Record<string, unknown>) {
    const room = await Room.findById(roomId).select("ownerId memberRoles roles").lean();
    if (!room) throw notFound("Room not found");

    if (room.ownerId !== userId) {
      const memberRoles = room.memberRoles as unknown as Record<string, string[]> | undefined;
      const userRoleIds = memberRoles?.[userId] || [];
      const hasPermission = room.roles.some(
        (r) => userRoleIds.includes(r.id) && r.permissions.includes("manage_channels")
      );
      if (!hasPermission) throw forbidden("Missing permission: manage_channels");
    }

    const safeUpdates: Record<string, unknown> = {};
    if (typeof updates.name === "string") safeUpdates.name = updates.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (updates.lessonId !== undefined) safeUpdates.lessonId = updates.lessonId;
    if (updates.lessonTitle !== undefined) safeUpdates.lessonTitle = updates.lessonTitle;

    const updated = await Channel.findByIdAndUpdate(channelId, { $set: safeUpdates }, { new: true });
    if (!updated) throw notFound("Channel not found");
    return updated.toJSON();
  },

  async delete(roomId: string, channelId: string, userId: string) {
    const room = await Room.findById(roomId).select("ownerId memberRoles roles categories");
    if (!room) throw notFound("Room not found");

    if (room.ownerId !== userId) {
      const userRoleIds = room.memberRoles?.get(userId) || [];
      const hasPermission = room.roles.some(
        (r) => userRoleIds.includes(r.id) && r.permissions.includes("manage_channels")
      );
      if (!hasPermission) throw forbidden("Missing permission: manage_channels");
    }

    // Remove from category
    for (const cat of room.categories) {
      cat.channelIds = cat.channelIds.filter((id) => id !== channelId);
    }
    room.markModified("categories");

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await room.save({ session });
      await Channel.findByIdAndDelete(channelId, { session });
      // Cascade: soft-delete all messages in the channel
      await Message.updateMany(
        { channelId, deleted: false },
        { $set: { deleted: true, content: "[channel deleted]" } },
        { session }
      );
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async linkLesson(channelId: string, lessonId: string, lessonTitle: string) {
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $set: { lessonId, lessonTitle } },
      { new: true }
    );
    if (!updated) throw notFound("Channel not found");
    return { ...updated.toJSON(), id: updated._id.toString() };
  },

  async unlinkLesson(channelId: string) {
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $unset: { lessonId: "", lessonTitle: "" } },
      { new: true }
    );
    if (!updated) throw notFound("Channel not found");
    return { ...updated.toJSON(), id: updated._id.toString() };
  },

  async touchLastMessage(_roomId: string, channelId: string) {
    await Channel.findByIdAndUpdate(channelId, { $set: { lastMessageAt: new Date() } });
  },

  async togglePin(_roomId: string, channelId: string, messageId: string) {
    // Try to remove first (atomic — no read needed)
    const removed = await Channel.findOneAndUpdate(
      { _id: channelId, pinnedMessageIds: messageId },
      { $pull: { pinnedMessageIds: messageId } },
      { new: true }
    ).lean();

    if (removed) return { ...removed, id: String(removed._id), serverId: removed.roomId };

    // Not pinned — add it
    const added = await Channel.findByIdAndUpdate(
      channelId,
      { $addToSet: { pinnedMessageIds: messageId } },
      { new: true }
    ).lean();
    if (!added) throw notFound("Channel not found");
    return { ...added, id: String(added._id), serverId: added.roomId };
  },
};
