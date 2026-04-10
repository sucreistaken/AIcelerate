import { Server, Socket, Namespace } from "socket.io";
import { profileService } from "./services/profileService";
import { messageService } from "./services/messageService";
import { roomService } from "./services/roomService";
import { channelService } from "./services/channelService";
import { checkSocketRateLimit } from "./middleware/rateLimiter";
import { authService } from "./services/authService";
import { logger } from "./utils/logger";
import {
  validateSocketData,
  socketAuthSchema,
  serverJoinSchema,
  serverLeaveSchema,
  channelJoinSchema,
  channelLeaveSchema,
  socketMsgSendSchema,
  socketMsgEditSchema,
  socketMsgDeleteSchema,
  socketMsgReactSchema,
  socketMsgPinSchema,
  lobbyMessageSchema,
  typingSchema,
  lessonLinkedSchema,
  lessonUnlinkedSchema,
  toolDataUpdateSchema,
  toolQuizAnswerSchema,
  toolFlashcardAddSchema,
  toolDeepdiveMsgSchema,
  toolMindmapUpdateSchema,
  toolSprintUpdateSchema,
  toolNoteSchema,
  toolNoteDeleteSchema,
  readMarkSchema,
} from "./validators/socketSchemas";

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();
// Track which channel each socket is viewing: socketId -> channelId
const activeChannels = new Map<string, string>();
// Track typing: channelId -> Map<userId, timeout>
const typingUsers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

// --- Channel membership verification for tool events ---
async function verifyChannelMember(userId: string, channelId: string): Promise<boolean> {
  try {
    const channel = await channelService.getByIdGlobal(channelId);
    if (!channel?.roomId) return false;
    const room = await roomService.getById(channel.roomId);
    return room.memberIds.includes(userId);
  } catch {
    return false;
  }
}

export function setupCollabNamespace(io: Server) {
  const collab = io.of("/collab");

  collab.on("connection", (socket: Socket) => {
    let userId: string | null = null;

    // ===== AUTH =====
    socket.on("auth", async (data: unknown, cb) => {
      try {
        const d = validateSocketData(socketAuthSchema, data, cb);
        if (!d) return;

        const decoded = authService.verifyToken(d.token);
        const resolvedUserId = decoded.userId;

        const profile = await profileService.getByIdOptional(resolvedUserId);
        if (!profile) {
          cb?.({ ok: false, error: "Profile not found" });
          return;
        }

        userId = resolvedUserId;

        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId)!.add(socket.id);

        socket.join(`user:${userId}`);

        for (const serverId of profile.serverIds) {
          socket.join(`server:${serverId}`);
        }

        await profileService.setStatus(userId, "online");
        broadcastPresence(collab, userId, "online", profile.serverIds);

        socket.join("channel:global-lobby");

        cb?.({ ok: true, profile });
      } catch (err: any) {
        logger.warn({ event: "auth", error: err.message }, "Socket auth failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    // ===== SERVER EVENTS =====
    socket.on("server:join", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(serverJoinSchema, data, cb);
      if (!d) return;
      try {
        const server = await roomService.join(d.serverId, userId);
        socket.join(`server:${server.id}`);

        const profile = await profileService.getById(userId);
        collab.to(`server:${server.id}`).emit("server:member:joined", {
          serverId: server.id,
          member: { id: profile.id, nickname: profile.nickname, avatar: profile.avatar, status: profile.status },
        });

        const channels = await channelService.getByServer(server.id);
        const general = channels.find((c) => c.name === "genel" && c.type === "text");
        if (general) {
          const sysMsg = await messageService.sendSystem(general.id, server.id, `${profile.nickname} sunucuya katıldı!`);
          collab.to(`channel:${general.id}`).emit("msg:new", sysMsg);
        }

        cb?.({ ok: true, server });
      } catch (err: any) {
        logger.warn({ event: "server:join", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("server:leave", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(serverLeaveSchema, data, cb);
      if (!d) return;
      try {
        await roomService.leave(d.serverId, userId);
        socket.leave(`server:${d.serverId}`);

        collab.to(`server:${d.serverId}`).emit("server:member:left", {
          serverId: d.serverId,
          userId,
        });

        cb?.({ ok: true });
      } catch (err: any) {
        logger.warn({ event: "server:leave", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    // ===== CHANNEL EVENTS =====
    socket.on("channel:join", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(channelJoinSchema, data, cb);
      if (!d) return;
      try {
        const server = await roomService.getById(d.serverId);
        if (!server.memberIds.includes(userId)) {
          return cb?.({ ok: false, error: "Not a member of this server" });
        }

        const prevChannel = activeChannels.get(socket.id);
        if (prevChannel) {
          socket.leave(`channel:${prevChannel}`);
          collab.to(`channel:${prevChannel}`).emit("channel:presence", {
            channelId: prevChannel, userId, action: "left",
          });
        }

        socket.join(`channel:${d.channelId}`);
        activeChannels.set(socket.id, d.channelId);

        collab.to(`channel:${d.channelId}`).emit("channel:presence", {
          channelId: d.channelId, userId, action: "joined",
        });

        cb?.({ ok: true });
      } catch (err: any) {
        logger.warn({ event: "channel:join", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("channel:leave", async (data: unknown) => {
      const d = validateSocketData(channelLeaveSchema, data);
      if (!d) return;
      socket.leave(`channel:${d.channelId}`);
      activeChannels.delete(socket.id);

      if (userId) {
        collab.to(`channel:${d.channelId}`).emit("channel:presence", {
          channelId: d.channelId, userId, action: "left",
        });
      }
    });

    // ===== MESSAGE EVENTS =====
    socket.on("msg:send", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(socketMsgSendSchema, data, cb);
      if (!d) return;
      if (!checkSocketRateLimit("msg", userId, 5, 1000)) {
        return cb?.({ ok: false, error: "Rate limited" });
      }

      try {
        const server = await roomService.getById(d.serverId);
        if (!server.memberIds.includes(userId)) {
          return cb?.({ ok: false, error: "Not a member of this server" });
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
      } catch (err: any) {
        logger.warn({ event: "msg:send", userId, channelId: d.channelId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("msg:edit", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(socketMsgEditSchema, data, cb);
      if (!d) return;
      try {
        const message = await messageService.edit(d.channelId, d.messageId, userId, d.content);
        collab.to(`channel:${d.channelId}`).emit("msg:edited", message);
        cb?.({ ok: true, message });
      } catch (err: any) {
        logger.warn({ event: "msg:edit", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("msg:delete", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(socketMsgDeleteSchema, data, cb);
      if (!d) return;
      try {
        await messageService.delete(d.channelId, d.messageId, userId);
        collab.to(`channel:${d.channelId}`).emit("msg:deleted", {
          channelId: d.channelId, messageId: d.messageId,
        });
        cb?.({ ok: true });
      } catch (err: any) {
        logger.warn({ event: "msg:delete", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("msg:react", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(socketMsgReactSchema, data, cb);
      if (!d) return;
      try {
        const message = await messageService.react(d.channelId, d.messageId, d.emoji, userId);
        collab.to(`channel:${d.channelId}`).emit("msg:reacted", message);
        cb?.({ ok: true });
      } catch (err: any) {
        logger.warn({ event: "msg:react", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    socket.on("msg:pin", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(socketMsgPinSchema, data, cb);
      if (!d) return;
      try {
        const message = await messageService.pin(d.channelId, d.serverId, d.messageId);
        collab.to(`channel:${d.channelId}`).emit("msg:pinned", message);
        cb?.({ ok: true });
      } catch (err: any) {
        logger.warn({ event: "msg:pin", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    // ===== LOBBY =====
    socket.on("lobby:message", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(lobbyMessageSchema, data, cb);
      if (!d) return;
      if (!checkSocketRateLimit("msg", userId, 5, 1000)) {
        return cb?.({ ok: false, error: "Rate limited" });
      }

      try {
        const message = await messageService.sendLobby("global-lobby", userId, d.content);
        collab.to("channel:global-lobby").emit("msg:new", message);
        cb?.({ ok: true, message });
      } catch (err: any) {
        logger.warn({ event: "lobby:message", userId, error: err.message }, "Socket event failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    // ===== TYPING =====
    socket.on("typing:start", (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(typingSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("typing", userId, 3, 3000)) return;

      if (!typingUsers.has(d.channelId)) typingUsers.set(d.channelId, new Map());
      const channelTyping = typingUsers.get(d.channelId)!;

      if (channelTyping.has(userId)) clearTimeout(channelTyping.get(userId)!);

      channelTyping.set(userId, setTimeout(() => {
        channelTyping.delete(userId!);
        socket.to(`channel:${d.channelId}`).emit("typing:stop", {
          channelId: d.channelId, userId,
        });
      }, 5000));

      socket.to(`channel:${d.channelId}`).emit("typing:start", {
        channelId: d.channelId, userId,
      });
    });

    socket.on("typing:stop", (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(typingSchema, data);
      if (!d) return;
      clearTyping(d.channelId, userId, collab);
    });

    // ===== LESSON LINKING =====
    socket.on("channel:lesson:linked", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(lessonLinkedSchema, data);
      if (!d) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("channel:lesson:linked", d);
    });

    socket.on("channel:lesson:unlinked", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(lessonUnlinkedSchema, data);
      if (!d) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("channel:lesson:unlinked", d);
    });

    // ===== TOOL EVENTS (real-time sync for study tool channels) =====
    // All tool events: validate + verify channel membership + rate limit
    socket.on("tool:data:update", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolDataUpdateSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:data:update", d);
    });

    socket.on("tool:quiz:answer", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolQuizAnswerSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      collab.to(`channel:${d.channelId}`).emit("tool:quiz:answered", d);
    });

    socket.on("tool:flashcard:add", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolFlashcardAddSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:flashcard:added", d);
    });

    socket.on("tool:deepdive:msg", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolDeepdiveMsgSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:deepdive:newmsg", d);
    });

    socket.on("tool:mindmap:update", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolMindmapUpdateSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:mindmap:updated", d);
    });

    socket.on("tool:sprint:update", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolSprintUpdateSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      collab.to(`channel:${d.channelId}`).emit("tool:sprint:updated", d);
    });

    socket.on("tool:notes:add", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolNoteSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:notes:added", d);
    });

    socket.on("tool:notes:edit", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolNoteSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:notes:edited", d);
    });

    socket.on("tool:notes:delete", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolNoteDeleteSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:notes:deleted", d);
    });

    socket.on("tool:notes:pin", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(toolNoteSchema, data);
      if (!d) return;
      if (!checkSocketRateLimit("tool", userId, 10, 5000)) return;
      if (!(await verifyChannelMember(userId, d.channelId))) return;
      socket.to(`channel:${d.channelId}`).emit("tool:notes:pinned", d);
    });

    // ===== RECONNECTION STATE RECOVERY =====
    socket.on("reconnect:state", async (_data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      try {
        const profile = await profileService.getByIdOptional(userId);
        if (!profile) return cb?.({ ok: false, error: "Profile not found" });

        // Gather active channel for this socket
        const activeChannelId = activeChannels.get(socket.id) || null;

        // Gather online members for user's servers
        const serverPresence: Record<string, string[]> = {};
        for (const serverId of profile.serverIds) {
          const room = await roomService.getById(serverId).catch(() => null);
          if (!room) continue;
          const onlineMembers = room.memberIds.filter((mid: string) => onlineUsers.has(mid));
          serverPresence[serverId] = onlineMembers;
        }

        cb?.({
          ok: true,
          activeChannelId,
          serverPresence,
          serverIds: profile.serverIds,
        });
      } catch (err: any) {
        logger.warn({ event: "reconnect:state", userId, error: err.message }, "Reconnection state failed");
        cb?.({ ok: false, error: err.message });
      }
    });

    // ===== READ RECEIPTS =====
    socket.on("read:mark", async (data: unknown) => {
      if (!userId) return;
      const d = validateSocketData(readMarkSchema, data);
      if (!d) return;
      socket.to(`user:${userId}`).emit("read:updated", {
        channelId: d.channelId, lastReadMessageId: d.messageId,
      });
    });

    // ===== DISCONNECT =====
    socket.on("disconnect", async () => {
      if (!userId) return;

      // Clean up typing state for ALL channels this user was typing in
      for (const [chId, channelTyping] of typingUsers.entries()) {
        if (channelTyping.has(userId)) {
          clearTimeout(channelTyping.get(userId)!);
          channelTyping.delete(userId);
          collab.to(`channel:${chId}`).emit("typing:stop", { channelId: chId, userId });
        }
        if (channelTyping.size === 0) typingUsers.delete(chId);
      }

      // Clean up active channel
      const channelId = activeChannels.get(socket.id);
      if (channelId) {
        activeChannels.delete(socket.id);
      }

      // Clean up online status
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          try {
            const profile = await profileService.getByIdOptional(userId);
            if (profile) {
              await profileService.setStatus(userId, "offline");
              broadcastPresence(collab, userId, "offline", profile.serverIds);
            }
          } catch (err: any) {
            logger.warn({ event: "disconnect", userId, error: err.message }, "Socket disconnect cleanup failed");
          }
        }
      }
    });
  });

  return collab;
}

function broadcastPresence(collab: Namespace, userId: string, status: string, serverIds: string[]) {
  for (const serverId of serverIds) {
    collab.to(`server:${serverId}`).emit("presence:update", { userId, status });
  }
}

function clearTyping(channelId: string, userId: string, collab: Namespace) {
  const channelTyping = typingUsers.get(channelId);
  if (channelTyping) {
    if (channelTyping.has(userId)) {
      clearTimeout(channelTyping.get(userId)!);
      channelTyping.delete(userId);
    }
    collab.to(`channel:${channelId}`).emit("typing:stop", { channelId, userId });
  }
}

export function getOnlineUserIds(): string[] {
  return [...onlineUsers.keys()];
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}
