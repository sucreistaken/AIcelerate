import { Message, IMessage, MessageEmbed } from "../models/Message";
import { channelService } from "./channelService";
import { eventBus } from "../events/eventBus";
import { badRequest, notFound, forbidden } from "../middleware/errorHandler";
import { leanArrayToId } from "../config/mongoose-plugins";

function parseMentions(content: string): string[] {
  const matches = content.match(/@(\S+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

export const messageService = {
  async send(
    channelId: string,
    serverId: string,
    authorId: string,
    content: string,
    type: string = "text",
    embeds: MessageEmbed[] = [],
    threadId?: string
  ) {
    if (type === "text" && (!content || content.trim().length === 0)) {
      throw badRequest("Message content cannot be empty");
    }

    const message = await Message.create({
      channelId,
      roomId: serverId,
      authorId,
      content: content.trim(),
      type,
      embeds,
      mentions: parseMentions(content),
      threadId,
    });

    // Update parent message reply count if thread reply
    if (threadId) {
      await Message.findByIdAndUpdate(threadId, { $inc: { replyCount: 1 } });
    }

    // Touch channel lastMessageAt
    await channelService.touchLastMessage(serverId, channelId);

    const result = message.toJSON();
    eventBus.emit("message:sent", { channelId, serverId, message: result });

    return result;
  },

  async sendSystem(channelId: string, serverId: string, content: string) {
    return this.send(channelId, serverId, "system", content, "system");
  },

  async getMessages(channelId: string, limit = 50, before?: string) {
    const filter: any = { channelId, deleted: false };
    if (before) {
      filter._id = { $lt: before };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return leanArrayToId(messages).reverse();
  },

  async getThread(channelId: string, threadId: string) {
    const messages = await Message.find({ channelId, threadId, deleted: false })
      .sort({ createdAt: 1 })
      .lean();
    return leanArrayToId(messages);
  },

  async edit(channelId: string, messageId: string, userId: string, content: string) {
    const msg = await Message.findOne({ _id: messageId, channelId });
    if (!msg) throw notFound("Message not found");
    if (msg.authorId !== userId) throw forbidden("Can only edit your own messages");
    if (msg.deleted) throw badRequest("Cannot edit deleted message");

    const updated = await Message.findByIdAndUpdate(messageId, {
      $set: {
        content: content.trim(),
        mentions: parseMentions(content),
        edited: true,
      },
    }, { new: true });

    return updated!.toJSON();
  },

  async delete(channelId: string, messageId: string, userId: string, isAdmin = false) {
    const msg = await Message.findOne({ _id: messageId, channelId });
    if (!msg) throw notFound("Message not found");
    if (msg.authorId !== userId && !isAdmin) throw forbidden("Can only delete your own messages");

    await Message.findByIdAndUpdate(messageId, {
      $set: { deleted: true, content: "" },
    });

    eventBus.emit("message:deleted", { channelId, messageId });
  },

  async react(channelId: string, messageId: string, emoji: string, userId: string) {
    const msg = await Message.findOne({ _id: messageId, channelId });
    if (!msg) throw notFound("Message not found");

    const reactions = [...msg.reactions];
    const existing = reactions.find((r) => r.emoji === emoji);

    if (existing) {
      if (existing.userIds.includes(userId)) {
        existing.userIds = existing.userIds.filter((id) => id !== userId);
        if (existing.userIds.length === 0) {
          reactions.splice(reactions.indexOf(existing), 1);
        }
      } else {
        existing.userIds.push(userId);
      }
    } else {
      reactions.push({ emoji, userIds: [userId] });
    }

    const updated = await Message.findByIdAndUpdate(messageId, {
      $set: { reactions },
    }, { new: true });

    eventBus.emit("message:reacted", { channelId, messageId, emoji, userId });
    return updated!.toJSON();
  },

  async pin(channelId: string, serverId: string, messageId: string) {
    const msg = await Message.findOne({ _id: messageId, channelId });
    if (!msg) throw notFound("Message not found");

    const updated = await Message.findByIdAndUpdate(messageId, {
      $set: { pinned: !msg.pinned },
    }, { new: true });

    await channelService.togglePin(serverId, channelId, messageId);

    return updated!.toJSON();
  },

  async sendLobby(channelId: string, authorId: string, content: string) {
    if (!content || content.trim().length === 0) {
      throw badRequest("Message content cannot be empty");
    }

    const message = await Message.create({
      channelId,
      roomId: "lobby",
      authorId,
      content: content.trim(),
      type: "text",
      mentions: parseMentions(content),
    });

    return message.toJSON();
  },

  async getUnreadCount(channelId: string, lastReadMessageId: string) {
    return Message.countDocuments({
      channelId,
      deleted: false,
      _id: { $gt: lastReadMessageId },
    });
  },
};
