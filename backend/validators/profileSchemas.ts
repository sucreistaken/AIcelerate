import { z } from "zod";

export const createProfileSchema = z.object({
  nickname: z.string().min(2).max(32),
  avatar: z.string().optional(),
});

export const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(32).optional(),
  avatar: z.string().optional(),
  bio: z.string().max(500).optional(),
});

export const setStatusSchema = z.object({
  status: z.enum(["online", "idle", "dnd", "offline"]),
});

export const friendRequestSchema = z.object({
  friendCode: z.string().min(1),
});

export const friendActionSchema = z.object({
  fromId: z.string().min(1),
});
