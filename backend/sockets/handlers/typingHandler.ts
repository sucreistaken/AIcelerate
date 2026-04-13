import type { Socket, Namespace } from "socket.io";
import { checkSocketRateLimit } from "../../middleware/rateLimiter";
import {
  validateSocketData,
  typingSchema,
} from "../../validators/socketSchemas";

export function registerTypingHandlers(
  socket: Socket,
  collab: Namespace,
  getUserId: () => string | null,
  typingUsers: Map<string, Map<string, ReturnType<typeof setTimeout>>>,
  clearTyping: (channelId: string, userId: string, collab: Namespace) => void,
  verifyChannelMember: (userId: string, channelId: string) => Promise<boolean>,
) {
  socket.on("typing:start", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(typingSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("typing", userId, 3, 3000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;

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
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(typingSchema, data);
    if (!d) return;
    clearTyping(d.channelId, userId, collab);
  });
}
