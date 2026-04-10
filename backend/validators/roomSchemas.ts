import { z } from "zod";

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  iconColor: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  university: z.string().max(100).optional(),
  isPublic: z.boolean().optional(),
  templateId: z.string().optional(),
});

export const createSoloRoomSchema = z.object({
  name: z.string().min(1).max(100),
  topic: z.string().max(200).optional(),
  templateId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  iconColor: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  university: z.string().max(100).optional(),
  isPublic: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const updateTopicSchema = z.object({
  topic: z.string().min(1).max(200),
});

export const joinByInviteSchema = z.object({
  inviteCode: z.string().min(1).max(20),
});

export const kickSchema = z.object({
  targetId: z.string().min(1),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1),
});

export const setMaterialSchema = z.object({
  materialId: z.string().min(1),
});

export const addCategorySchema = z.object({
  name: z.string().min(1).max(100),
});
