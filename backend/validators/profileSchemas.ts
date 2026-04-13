import { z } from "zod";

export const createProfileSchema = z.object({
  nickname: z.string().min(2).max(32),
  avatar: z.string().optional(),
}).strict();

export const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(32).optional(),
  avatar: z.string().optional(),
  bio: z.string().max(500).optional(),
}).strict();

export const setStatusSchema = z.object({
  status: z.enum(["online", "idle", "dnd", "offline"]),
}).strict();

export const friendRequestSchema = z.object({
  friendCode: z.string().min(1),
}).strict();

export const friendActionSchema = z.object({
  fromId: z.string().min(1),
}).strict();
