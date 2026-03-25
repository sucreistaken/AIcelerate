import { z } from "zod";

export const transcribeStartSchema = z.object({
  lessonId: z.string().optional(),
});

export const slidesUploadSchema = z.object({
  lessonId: z.string().min(1, "lessonId is required"),
});
