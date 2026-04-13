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
}).strict();

// --- Server Events ---
export const serverJoinSchema = z.object({
  serverId: z.string().min(1),
}).strict();

export const serverLeaveSchema = z.object({
  serverId: z.string().min(1),
}).strict();

// --- Channel Events ---
export const channelJoinSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
}).strict();

export const channelLeaveSchema = z.object({
  channelId: z.string().min(1),
}).strict();

// --- Message Events ---
export const socketMsgSendSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
  content: z.string().min(1).max(4000),
  threadId: z.string().optional(),
}).strict();

export const socketMsgEditSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  content: z.string().min(1).max(4000),
}).strict();

export const socketMsgDeleteSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
}).strict();

export const socketMsgReactSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(20),
}).strict();

export const socketMsgPinSchema = z.object({
  channelId: z.string().min(1),
  serverId: z.string().min(1),
  messageId: z.string().min(1),
}).strict();

// --- Lobby ---
export const lobbyMessageSchema = z.object({
  content: z.string().min(1).max(2000),
}).strict();

// --- Typing ---
export const typingSchema = z.object({
  channelId: z.string().min(1),
}).strict();

// --- Lesson Linking ---
export const lessonLinkedSchema = z.object({
  channelId: z.string().min(1),
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
}).strict();

export const lessonUnlinkedSchema = z.object({
  channelId: z.string().min(1),
}).strict();

// --- Tool Events ---
export const toolDataUpdateSchema = z.object({
  channelId: z.string().min(1),
  toolData: z.record(z.string(), z.unknown()),
}).strict();

export const toolQuizAnswerSchema = z.object({
  channelId: z.string().min(1),
  result: z.record(z.string(), z.unknown()),
}).strict();

export const toolFlashcardAddSchema = z.object({
  channelId: z.string().min(1),
  card: z.record(z.string(), z.unknown()),
}).strict();

export const toolDeepdiveMsgSchema = z.object({
  channelId: z.string().min(1),
  userMessage: z.record(z.string(), z.unknown()),
  aiMessage: z.record(z.string(), z.unknown()),
}).strict();

export const toolMindmapUpdateSchema = z.object({
  channelId: z.string().min(1),
  mindMap: z.record(z.string(), z.unknown()),
}).strict();

export const toolSprintUpdateSchema = z.object({
  channelId: z.string().min(1),
  sprint: z.record(z.string(), z.unknown()),
}).strict();

export const toolNoteSchema = z.object({
  channelId: z.string().min(1),
  note: z.record(z.string(), z.unknown()),
}).strict();

export const toolNoteDeleteSchema = z.object({
  channelId: z.string().min(1),
  noteId: z.string().min(1),
}).strict();

// --- Read Receipts ---
export const readMarkSchema = z.object({
  channelId: z.string().min(1),
  messageId: z.string().min(1),
}).strict();
