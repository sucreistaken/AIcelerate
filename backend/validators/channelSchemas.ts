import { z } from "zod";

export const createChannelSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "announcement", "study-tool"]),
  toolType: z.enum(["quiz", "flashcards", "deep-dive", "mind-map", "sprint", "notes"]).optional(),
  lessonId: z.string().optional(),
  lessonTitle: z.string().optional(),
}).strict();

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  lessonId: z.string().optional(),
  lessonTitle: z.string().optional(),
}).strict();

export const linkLessonSchema = z.object({
  serverId: z.string().min(1, "serverId is required"),
  lessonId: z.string().min(1, "lessonId is required"),
  lessonTitle: z.string().min(1, "lessonTitle is required"),
}).strict();

export const unlinkLessonSchema = z.object({
  serverId: z.string().min(1, "serverId is required"),
}).strict();
