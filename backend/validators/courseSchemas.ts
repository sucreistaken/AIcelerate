import { z } from "zod";

const courseSettingsSchema = z.object({
  language: z.enum(["tr", "en"]).optional(),
  examDate: z.string().optional(),
}).strict();

export const createCourseSchema = z.object({
  code: z.string().min(1, "code is required"),
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  learningOutcomes: z.array(z.string()).optional(),
  settings: courseSettingsSchema.optional(),
}).strict();

export const updateCourseSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  learningOutcomes: z.array(z.string()).optional(),
  settings: courseSettingsSchema.optional(),
}).strict();

export const courseChatSchema = z.object({
  message: z.string().min(1, "message is required"),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  }).strict()).optional(),
}).strict();

export const studyScheduleSchema = z.object({
  examDate: z.string().optional(),
}).strict();
