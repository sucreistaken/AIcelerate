import type { Socket, Namespace } from "socket.io";
import { checkSocketRateLimit } from "../../middleware/rateLimiter";
import {
  validateSocketData,
  toolDataUpdateSchema,
  toolQuizAnswerSchema,
  toolFlashcardAddSchema,
  toolDeepdiveMsgSchema,
  toolMindmapUpdateSchema,
  toolSprintUpdateSchema,
  toolNoteSchema,
  toolNoteDeleteSchema,
} from "../../validators/socketSchemas";

export function registerToolHandlers(
  socket: Socket,
  collab: Namespace,
  getUserId: () => string | null,
  verifyChannelMember: (userId: string, channelId: string) => Promise<boolean>,
) {
  socket.on("tool:data:update", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolDataUpdateSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:data:update", d);
  });

  socket.on("tool:quiz:answer", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolQuizAnswerSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    collab.to(`channel:${d.channelId}`).emit("tool:quiz:answered", d);
  });

  socket.on("tool:flashcard:add", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolFlashcardAddSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:flashcard:added", d);
  });

  socket.on("tool:deepdive:msg", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolDeepdiveMsgSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:deepdive:newmsg", d);
  });

  socket.on("tool:mindmap:update", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolMindmapUpdateSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:mindmap:updated", d);
  });

  socket.on("tool:sprint:update", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolSprintUpdateSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    collab.to(`channel:${d.channelId}`).emit("tool:sprint:updated", d);
  });

  socket.on("tool:notes:add", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolNoteSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:notes:added", d);
  });

  socket.on("tool:notes:edit", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolNoteSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:notes:edited", d);
  });

  socket.on("tool:notes:delete", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolNoteDeleteSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:notes:deleted", d);
  });

  socket.on("tool:notes:pin", async (data: unknown) => {
    const userId = getUserId();
    if (!userId) return;
    const d = validateSocketData(toolNoteSchema, data);
    if (!d) return;
    if (!(await checkSocketRateLimit("tool", userId, 10, 5000))) return;
    if (!(await verifyChannelMember(userId, d.channelId))) return;
    socket.to(`channel:${d.channelId}`).emit("tool:notes:pinned", d);
  });
}
