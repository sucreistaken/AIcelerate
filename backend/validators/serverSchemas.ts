import { z } from "zod";

export const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  iconColor: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  university: z.string().max(100).optional(),
  isPublic: z.boolean().optional(),
  templateId: z.string().optional(),
}).strict();

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  iconColor: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  university: z.string().max(100).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const joinByInviteSchema = z.object({
  inviteCode: z.string().min(1).max(20),
}).strict();

export const kickSchema = z.object({
  targetId: z.string().min(1),
}).strict();

export const addCategorySchema = z.object({
  name: z.string().min(1).max(100),
}).strict();
