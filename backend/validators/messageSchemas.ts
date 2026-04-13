import { z } from "zod";

export const sendMessageSchema = z.object({
  serverId: z.string().min(1),
  content: z.string().min(1).max(4000),
  type: z.enum(["text", "system", "file"]).default("text"),
  embeds: z.array(z.unknown()).optional(),
  threadId: z.string().optional(),
}).strict();

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
}).strict();

export const reactMessageSchema = z.object({
  emoji: z.string().min(1).max(20),
}).strict();

export const pinMessageSchema = z.object({
  serverId: z.string().min(1),
}).strict();

export const sendLobbyMessageSchema = z.object({
  content: z.string().min(1).max(2000),
}).strict();
