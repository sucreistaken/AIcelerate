import { z, ZodSchema } from "zod";

// --- Helper: validate socket event data, returns parsed data or calls cb with error and returns null ---
export function validateSocketData<T>(schema: ZodSchema<T>, data: unknown, cb?: (res: { ok: false; error: string }) => void): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join(", ");
    cb?.({ ok: false, error: `Validation failed: ${msg}` });
    return null;
  }
  return result.data;
}

// --- Auth ---
export const socketAuthSchema = z.object({
  token: z.string().min(1, "Token required"),
});

// --- Server Events ---
export const serverJoinSchema = z.object({
  serverId: z.string().min(1),
});

export const serverLeaveSchema = z.object({
  serverId: z.string().min(1),
});

// --- Channel Events ---
export const channelJoinSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
});

export const channelLeaveSchema = z.object({
  channelId: z.string().min(1),
});

// --- Message Events ---
export const socketMsgSendSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
  content: z.string().min(1).max(4000),
  threadId: z.string().optional(),
});

export const socketMsgEditSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

export const socketMsgDeleteSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
});

export const socketMsgReactSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(20),
});

export const socketMsgPinSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
  messageId: z.string().min(1),
});

// --- Lobby ---
export const lobbyMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

// --- Typing ---
export const typingSchema = z.object({
  channelId: z.string().min(1),
});

// --- Lesson Linking ---
export const lessonLinkedSchema = z.object({
  channelId: z.string().min(1),
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
});

export const lessonUnlinkedSchema = z.object({
  channelId: z.string().min(1),
});

// --- Tool Events ---
export const toolDataUpdateSchema = z.object({
  channelId: z.string().min(1),
  toolData: z.record(z.string(), z.unknown()),
});

export const toolQuizAnswerSchema = z.object({
  channelId: z.string().min(1),
  result: z.record(z.string(), z.unknown()),
});

export const toolFlashcardAddSchema = z.object({
  channelId: z.string().min(1),
  card: z.record(z.string(), z.unknown()),
});

export const toolDeepdiveMsgSchema = z.object({
  channelId: z.string().min(1),
  userMessage: z.record(z.string(), z.unknown()),
  aiMessage: z.record(z.string(), z.unknown()),
});

export const toolMindmapUpdateSchema = z.object({
  channelId: z.string().min(1),
  mindMap: z.record(z.string(), z.unknown()),
});

export const toolSprintUpdateSchema = z.object({
  channelId: z.string().min(1),
  sprint: z.record(z.string(), z.unknown()),
});

export const toolNoteSchema = z.object({
  channelId: z.string().min(1),
  note: z.record(z.string(), z.unknown()),
});

export const toolNoteDeleteSchema = z.object({
  channelId: z.string().min(1),
  noteId: z.string().min(1),
});

// --- Read Receipts ---
export const readMarkSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
});
