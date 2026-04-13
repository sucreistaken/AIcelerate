import type { Socket, Namespace } from "socket.io";
import { roomService } from "../../services/roomService";
import { logger } from "../../utils/logger";
import {
  validateSocketData,
  channelJoinSchema,
  channelLeaveSchema,
} from "../../validators/socketSchemas";

export function registerChannelHandlers(
  socket: Socket,
  collab: Namespace,
  getUserId: () => string | null,
  activeChannels: Map<string, string>,
) {
  socket.on("channel:join", async (data: unknown, cb) => {
    const userId = getUserId();
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ event: "channel:join", userId, error: message }, "Socket event failed");
      cb?.({ ok: false, error: message });
    }
  });

  socket.on("channel:leave", async (data: unknown) => {
    const userId = getUserId();
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
}
