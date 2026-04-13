import { Server, Socket, Namespace } from "socket.io";
import { profileService } from "./services/profileService";
import { messageService } from "./services/messageService";
import { roomService } from "./services/roomService";
import { channelService } from "./services/channelService";
import { checkSocketRateLimit } from "./middleware/rateLimiter";
import { authService } from "./services/authService";
import { logger } from "./utils/logger";
import { TTLCache } from "./utils/cache";
import {
  validateSocketData,
  socketAuthSchema,
  serverJoinSchema,
  serverLeaveSchema,
  lobbyMessageSchema,
  lessonLinkedSchema,
  lessonUnlinkedSchema,
  readMarkSchema,
} from "./validators/socketSchemas";
import { registerMessageHandlers } from "./sockets/handlers/messageHandler";
import { registerChannelHandlers } from "./sockets/handlers/channelHandler";
import { registerToolHandlers } from "./sockets/handlers/toolHandler";
import { registerTypingHandlers } from "./sockets/handlers/typingHandler";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();
// Track which channel each socket is viewing: socketId -> channelId
const activeChannels = new Map<string, string>();
// Track typing: channelId -> Map<userId, timeout>
const typingUsers = new Map<string, Map<string, ReturnType<typeof setTimeout>>>();

// --- Channel membership verification for tool events ---
// Cache channel membership checks for 30 seconds to reduce DB queries
const membershipCache = new TTLCache<boolean>({ ttlMs: 30_000, maxSize: 500 });

async function verifyChannelMember(userId: string, channelId: string): Promise<boolean> {
  const key = `${userId}:${channelId}`;
  return membershipCache.getOrSet(key, async () => {
    try {
      const channel = await channelService.getByIdGlobal(channelId);
      if (!channel?.roomId) return false;
      const room = await roomService.getById(channel.roomId);
      return room.memberIds.includes(userId);
    } catch (err: unknown) {
      logger.warn({ userId, channelId, error: errMsg(err) }, "Channel membership check failed");
      return false;
    }
  });
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

export function setupCollabNamespace(io: Server) {
  const collab = io.of("/collab");

  collab.on("connection", (socket: Socket) => {
    let userId: string | null = null;

    const getUserId = () => userId;

    // Auth timeout: disconnect if not authenticated within 10 seconds
    const authTimeout = setTimeout(() => {
      if (!userId) {
        logger.warn({ socketId: socket.id }, "Socket auth timeout — disconnecting");
        socket.disconnect(true);
      }
    }, 10_000);

    // ===== AUTH =====
    socket.on("auth", async (data: unknown, cb) => {
      try {
        // Re-auth guard: prevent re-authenticating as a different user
        if (userId) {
          cb?.({ ok: false, error: "Already authenticated" });
          return;
        }

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
        clearTimeout(authTimeout);

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
      } catch (err: unknown) {
        logger.warn({ event: "auth", error: errMsg(err) }, "Socket auth failed");
        cb?.({ ok: false, error: errMsg(err) });
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

        // Invalidate membership cache after join
        membershipCache.invalidate(`${userId}:*`);

        cb?.({ ok: true, server });
      } catch (err: unknown) {
        logger.warn({ event: "server:join", userId, error: errMsg(err) }, "Socket event failed");
        cb?.({ ok: false, error: errMsg(err) });
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

        // Invalidate membership cache after leave
        membershipCache.invalidate(`${userId}:*`);

        cb?.({ ok: true });
      } catch (err: unknown) {
        logger.warn({ event: "server:leave", userId, error: errMsg(err) }, "Socket event failed");
        cb?.({ ok: false, error: errMsg(err) });
      }
    });

    // ===== REGISTER EXTRACTED HANDLER MODULES =====
    registerMessageHandlers(socket, collab, getUserId, verifyChannelMember, clearTyping);
    registerChannelHandlers(socket, collab, getUserId, activeChannels);
    registerToolHandlers(socket, collab, getUserId, verifyChannelMember);
    registerTypingHandlers(socket, collab, getUserId, typingUsers, clearTyping, verifyChannelMember);

    // ===== LOBBY =====
    socket.on("lobby:message", async (data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      const d = validateSocketData(lobbyMessageSchema, data, cb);
      if (!d) return;
      if (!(await checkSocketRateLimit("msg", userId, 5, 1000))) {
        return cb?.({ ok: false, error: "Rate limited" });
      }

      try {
        const message = await messageService.sendLobby("global-lobby", userId, d.content);
        collab.to("channel:global-lobby").emit("msg:new", message);
        cb?.({ ok: true, message });
      } catch (err: unknown) {
        logger.warn({ event: "lobby:message", userId, error: errMsg(err) }, "Socket event failed");
        cb?.({ ok: false, error: errMsg(err) });
      }
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

    // ===== RECONNECTION STATE RECOVERY =====
    socket.on("reconnect:state", async (_data: unknown, cb) => {
      if (!userId) return cb?.({ ok: false, error: "Not authenticated" });
      try {
        const profile = await profileService.getByIdOptional(userId);
        if (!profile) return cb?.({ ok: false, error: "Profile not found" });

        // Gather active channel for this socket
        const activeChannelId = activeChannels.get(socket.id) || null;

        // Gather online members for user's servers (single batch query via service)
        const serverPresence: Record<string, string[]> = {};
        const rooms = await roomService.getByIds(profile.serverIds, { memberIds: 1 });
        for (const room of rooms) {
          const roomId = typeof room._id === "string" ? room._id : String(room._id);
          const memberIds: string[] = Array.isArray(room.memberIds) ? room.memberIds : [];
          serverPresence[roomId] = memberIds.filter((mid) => onlineUsers.has(mid));
        }

        cb?.({
          ok: true,
          activeChannelId,
          serverPresence,
          serverIds: profile.serverIds,
        });
      } catch (err: unknown) {
        logger.warn({ event: "reconnect:state", userId, error: errMsg(err) }, "Reconnection state failed");
        cb?.({ ok: false, error: errMsg(err) });
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
      clearTimeout(authTimeout);
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
          } catch (err: unknown) {
            logger.warn({ event: "disconnect", userId, error: errMsg(err) }, "Socket disconnect cleanup failed");
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

export function getOnlineUserIds(): string[] {
  return [...onlineUsers.keys()];
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}
