import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  nickname: z.string().min(2).max(32),
}).strict();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
}).strict();

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
}).strict();
