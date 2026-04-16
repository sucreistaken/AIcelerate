import type { Socket, Namespace } from "socket.io";
import { messageService } from "../../services/messageService";
import { roomService } from "../../services/roomService";
import { checkSocketRateLimit } from "../../middleware/rateLimiter";
import { logger } from "../../utils/logger";
import {
  validateSocketData,
  socketMsgSendSchema,
  socketMsgEditSchema,
  socketMsgDeleteSchema,
  socketMsgReactSchema,
  socketMsgPinSchema,
} from "../../validators/socketSchemas";

export function registerMessageHandlers(
  socket: Socket,
  collab: Namespace,
  getUserId: () => string | null,
  verifyChannelMember: (userId: string, channelId: string) => Promise<boolean>,
  clearTyping: (channelId: string, userId: string, collab: Namespace) => void,
) {
  function errMsg(err: unknown): string {
    return err instanceof Error ? err.message : "Unknown error";
  }

  socket.on("msg:send", async (data: unknown, cb) => {
    const userId = getUserId();
    if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
    const d = validateSocketData(socketMsgSendSchema, data, cb);
    if (!d) return;
    if (!(await checkSocketRateLimit("msg", userId, 5, 1000))) {
      return cb?.({ ok: false, error: "Rate limited" });
    }

    try {
      const server = await roomService.getById(d.serverId);
      if (!server.memberIds.includes(userId)) {
        return cb?.({ ok: false, error: "Not a member of this server" });
      }

      if (!(await verifyChannelMember(userId, d.channelId))) {
        return cb?.({ ok: false, error: "Not a member of this channel" });
      }

      const message = await messageService.send(
        d.channelId, d.serverId, userId, d.content, "text", [], d.threadId
      );

      collab.to(`channel:${d.channelId}`).emit("msg:new", message);

      collab.to(`server:${d.serverId}`).emit("channel:activity", {
        channelId: d.channelId,
        lastMessageAt: message.createdAt,
        preview: message.content.slice(0, 100),
      });

      clearTyping(d.channelId, userId, collab);

      cb?.({ ok: true, message });
    } catch (err: unknown) {
      logger.warn({ event: "msg:send", userId, channelId: d.channelId, error: errMsg(err) }, "Socket event failed");
      cb?.({ ok: false, error: errMsg(err) });
    }
  });

  socket.on("msg:edit", async (data: unknown, cb) => {
    const userId = getUserId();
    if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
    const d = validateSocketData(socketMsgEditSchema, data, cb);
    if (!d) return;
    if (!(await checkSocketRateLimit("msg:edit", userId, 5, 3000))) {
      return cb?.({ ok: false, error: "Rate limited" });
    }
    try {
      if (!(await verifyChannelMember(userId, d.channelId))) {
        return cb?.({ ok: false, error: "Not a member of this channel" });
      }

      const message = await messageService.edit(d.channelId, d.messageId, userId, d.content);
      collab.to(`channel:${d.channelId}`).emit("msg:edited", message);
      cb?.({ ok: true, message });
    } catch (err: unknown) {
      logger.warn({ event: "msg:edit", userId, error: errMsg(err) }, "Socket event failed");
      cb?.({ ok: false, error: errMsg(err) });
    }
  });

  socket.on("msg:delete", async (data: unknown, cb) => {
    const userId = getUserId();
    if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
    const d = validateSocketData(socketMsgDeleteSchema, data, cb);
    if (!d) return;
    if (!(await checkSocketRateLimit("msg:delete", userId, 3, 3000))) {
      return cb?.({ ok: false, error: "Rate limited" });
    }
    try {
      // Lobby is open to every authenticated user — no server membership to
      // verify. `messageService.delete` still enforces authorship.
      const isLobby = d.channelId === "global-lobby";
      if (!isLobby && !(await verifyChannelMember(userId, d.channelId))) {
        return cb?.({ ok: false, error: "Not a member of this channel" });
      }

      await messageService.delete(d.channelId, d.messageId, userId);
      collab.to(`channel:${d.channelId}`).emit("msg:deleted", {
        channelId: d.channelId, messageId: d.messageId,
      });
      cb?.({ ok: true });
    } catch (err: unknown) {
      logger.warn({ event: "msg:delete", userId, error: errMsg(err) }, "Socket event failed");
      cb?.({ ok: false, error: errMsg(err) });
    }
  });

  socket.on("msg:react", async (data: unknown, cb) => {
    const userId = getUserId();
    if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
    const d = validateSocketData(socketMsgReactSchema, data, cb);
    if (!d) return;
    if (!(await checkSocketRateLimit("msg:react", userId, 10, 5000))) {
      return cb?.({ ok: false, error: "Rate limited" });
    }
    try {
      const isLobby = d.channelId === "global-lobby";
      if (!isLobby && !(await verifyChannelMember(userId, d.channelId))) {
        return cb?.({ ok: false, error: "Not a member of this channel" });
      }

      const message = await messageService.react(d.channelId, d.messageId, d.emoji, userId);
      collab.to(`channel:${d.channelId}`).emit("msg:reacted", message);
      cb?.({ ok: true });
    } catch (err: unknown) {
      logger.warn({ event: "msg:react", userId, error: errMsg(err) }, "Socket event failed");
      cb?.({ ok: false, error: errMsg(err) });
    }
  });

  socket.on("msg:pin", async (data: unknown, cb) => {
    const userId = getUserId();
    if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
    const d = validateSocketData(socketMsgPinSchema, data, cb);
    if (!d) return;
    if (!(await checkSocketRateLimit("msg:pin", userId, 3, 5000))) {
      return cb?.({ ok: false, error: "Rate limited" });
    }
    try {
      if (!(await verifyChannelMember(userId, d.channelId))) {
        return cb?.({ ok: false, error: "Not a member of this channel" });
      }

      const message = await messageService.pin(d.channelId, d.serverId, d.messageId);
      collab.to(`channel:${d.channelId}`).emit("msg:pinned", message);
      cb?.({ ok: true });
    } catch (err: unknown) {
      logger.warn({ event: "msg:pin", userId, error: errMsg(err) }, "Socket event failed");
      cb?.({ ok: false, error: errMsg(err) });
    }
  });
}
