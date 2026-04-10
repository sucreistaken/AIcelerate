import { z } from "zod";

export const createChannelSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(100),
  type: z.enum(["text", "voice", "study-tool"]),
  toolType: z.enum(["quiz", "flashcards", "deep-dive", "mind-map", "sprint", "notes"]).optional(),
  lessonId: z.string().optional(),
  lessonTitle: z.string().optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  lessonId: z.string().optional(),
  lessonTitle: z.string().optional(),
});
