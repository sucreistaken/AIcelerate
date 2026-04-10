import { Channel, IChannel } from "../models/Channel";
import { Room } from "../models/Room";
import { badRequest, notFound, forbidden } from "../middleware/errorHandler";
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
    const room = await Room.findById(roomId);
    if (!room) throw notFound("Room not found");

    // Check permission
    if (room.ownerId !== userId) {
      const userRoleIds = room.memberRoles?.get(userId) || [];
      const hasPermission = room.roles.some(
        (r) => userRoleIds.includes(r.id) && r.permissions.includes("manage_channels")
      );
      if (!hasPermission) throw forbidden("Missing permission: manage_channels");
    }

    // Validate category exists
    const cat = room.categories.find((c) => c.id === categoryId);
    if (!cat) throw notFound("Category not found");

    const channel = await this.create(roomId, categoryId, name, type, toolType, lessonId, lessonTitle);

    // Add channel to category
    cat.channelIds.push(channel.id);
    room.markModified("categories");
    await room.save();

    return channel;
  },

  async getByServer(roomId: string) {
    const channels = await Channel.find({ roomId }).sort({ order: 1 }).lean();
    return leanArrayToId(channels).map((ch: any) => ({ ...ch, serverId: ch.roomId }));
  },

  async getById(roomId: string, channelId: string) {
    const channel = await Channel.findOne({ _id: channelId, roomId });
    if (!channel) throw notFound("Channel not found");
    return channel.toJSON();
  },

  async getByIdGlobal(channelId: string) {
    const channel = await Channel.findById(channelId);
    if (!channel) throw notFound("Channel not found");
    return channel.toJSON();
  },

  async update(roomId: string, channelId: string, userId: string, updates: Record<string, any>) {
    const room = await Room.findById(roomId);
    if (!room) throw notFound("Room not found");

    if (room.ownerId !== userId) {
      const userRoleIds = room.memberRoles?.get(userId) || [];
      const hasPermission = room.roles.some(
        (r) => userRoleIds.includes(r.id) && r.permissions.includes("manage_channels")
      );
      if (!hasPermission) throw forbidden("Missing permission: manage_channels");
    }

    const safeUpdates: any = {};
    if (updates.name) safeUpdates.name = updates.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (updates.lessonId !== undefined) safeUpdates.lessonId = updates.lessonId;
    if (updates.lessonTitle !== undefined) safeUpdates.lessonTitle = updates.lessonTitle;

    const updated = await Channel.findByIdAndUpdate(channelId, { $set: safeUpdates }, { new: true });
    if (!updated) throw notFound("Channel not found");
    return updated.toJSON();
  },

  async delete(roomId: string, channelId: string, userId: string) {
    const room = await Room.findById(roomId);
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
    await room.save();

    await Channel.findByIdAndDelete(channelId);
  },

  async touchLastMessage(roomId: string, channelId: string) {
    await Channel.findByIdAndUpdate(channelId, { $set: { lastMessageAt: new Date() } });
  },

  async togglePin(roomId: string, channelId: string, messageId: string) {
    const channel = await Channel.findById(channelId);
    if (!channel) throw notFound("Channel not found");

    const isPinned = channel.pinnedMessageIds.includes(messageId);
    const update = isPinned
      ? { $pull: { pinnedMessageIds: messageId } }
      : { $addToSet: { pinnedMessageIds: messageId } };

    const updated = await Channel.findByIdAndUpdate(channelId, update, { new: true });
    return updated!.toJSON();
  },
};
