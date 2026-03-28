import { z } from "zod";

export const upsertLessonSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  transcript: z.string().optional(),
  slideText: z.string().optional(),
  plan: z.any().optional(),
  courseCode: z.string().optional(),
  learningOutcomes: z.array(z.string()).optional(),
  courseId: z.string().optional(),
}).passthrough();

export const progressSchema = z.object({
  lastMode: z.string().optional(),
  percent: z.number().min(0).max(100).optional(),
});

export const planFromTextSchema = z.object({
  lectureText: z.string().default(""),
  slidesText: z.string().default(""),
  alignOnly: z.boolean().optional(),
  prevPlan: z.any().optional(),
  lessonId: z.string().optional(),
  title: z.string().optional(),
  courseCode: z.string().optional(),
  learningOutcomes: z.array(z.string()).optional(),
});

export const cheatSheetSchema = z.object({
  language: z.enum(["tr", "en"]).default("tr"),
  courseWide: z.boolean().default(false),
});

export const loModulesSchema = z.object({
  // no required body fields — lesson data comes from DB
}).passthrough();

export const loAlignSchema = z.object({
  transcript: z.string().optional(),
  slidesText: z.string().optional(),
  learningOutcomes: z.array(z.string()).optional(),
});

export const chatSchema = z.object({
  message: z.string().min(1, "message is required"),
  history: z.array(z.object({
    role: z.enum(["user", "model", "assistant"]),
    content: z.string(),
  })).optional(),
});

export const mindmapModuleSchema = z.object({
  moduleIndex: z.number().int().default(-1),
});

export const mindmapNodeDetailSchema = z.object({
  nodeName: z.string().min(1, "nodeName is required"),
  action: z.enum(["explain", "example", "quiz", "all"]),
});

export const deviationSchema = z.object({
  // no required body fields — lesson data comes from DB
}).passthrough();
