import { Message, MessageEmbed, MessageReaction } from "../models/Message";
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
    const filter: { channelId: string; deleted: boolean; _id?: { $lt: string } } = { channelId, deleted: false };
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
    const msg = await Message.findOne({ _id: messageId, channelId }).select("authorId deleted").lean();
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
    const msg = await Message.findOne({ _id: messageId, channelId }).select("authorId threadId deleted").lean();
    if (!msg) throw notFound("Message not found");
    if (msg.authorId !== userId && !isAdmin) throw forbidden("Can only delete your own messages");

    await Message.findByIdAndUpdate(messageId, {
      $set: { deleted: true, content: "" },
    });

    // Decrement parent thread reply count
    if (msg.threadId) {
      await Message.findByIdAndUpdate(msg.threadId, { $inc: { replyCount: -1 } });
    }

    eventBus.emit("message:deleted", { channelId, messageId });
  },

  async react(channelId: string, messageId: string, emoji: string, userId: string) {
    const msg = await Message.findOne({ _id: messageId, channelId, deleted: false }).select("reactions").lean();
    if (!msg) throw notFound("Message not found");

    const existing = msg.reactions.find((r: MessageReaction) => r.emoji === emoji);
    const hasReacted = existing?.userIds?.includes(userId);

    let updated;
    if (hasReacted) {
      // Remove user from reaction
      updated = await Message.findOneAndUpdate(
        { _id: messageId, "reactions.emoji": emoji },
        { $pull: { "reactions.$.userIds": userId } },
        { new: true }
      );
      // Clean up empty reaction entries
      if (updated) {
        await Message.findByIdAndUpdate(messageId, {
          $pull: { reactions: { userIds: { $size: 0 } } },
        });
        updated = await Message.findById(messageId);
      }
    } else if (existing) {
      // Add user to existing reaction
      updated = await Message.findOneAndUpdate(
        { _id: messageId, "reactions.emoji": emoji },
        { $addToSet: { "reactions.$.userIds": userId } },
        { new: true }
      );
    } else {
      // Create new reaction
      updated = await Message.findByIdAndUpdate(
        messageId,
        { $push: { reactions: { emoji, userIds: [userId] } } },
        { new: true }
      );
    }

    return updated;
  },

  async pin(channelId: string, serverId: string, messageId: string) {
    const msg = await Message.findOne({ _id: messageId, channelId }).select("pinned").lean();
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
