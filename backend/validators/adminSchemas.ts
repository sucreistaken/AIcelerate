import { z } from "zod";

// ---- Pagination ----
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "email", "status", "role"]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(100).optional(),
}).strict();

// ---- User management ----
export const updateUserRoleSchema = z.object({
  role: z.string().min(1, "role is required"),
}).strict();

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  profile: z
    .object({
      nickname: z.string().optional(),
      avatar: z.string().optional(),
      department: z.string().optional(),
      bio: z.string().optional(),
    })
    .optional(),
  settings: z
    .object({
      theme: z.enum(["dark", "light"]).optional(),
      notifications: z.boolean().optional(),
      sound: z.boolean().optional(),
    })
    .optional(),
  status: z.enum(["online", "idle", "dnd", "offline"]).optional(),
}).strict();

// ---- Roles ----
export const createRoleSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().default(""),
  permissions: z.array(z.string()).default([]),
}).strict();

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
}).strict();

// ---- Settings ----
export const updateSettingsSchema = z.object({
  rateLimitPerMinute: z.number().int().min(1).optional(),
  maxUploadSizeMb: z.number().int().min(1).optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
}).strict();

// ---- Notifications ----
export const sendNotificationSchema = z.object({
  title: z.string().min(1, "title is required"),
  message: z.string().min(1, "message is required"),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  type: z.string().default("schedule-reminder"),
  targetUserIds: z.array(z.string()).optional(),
}).strict();

// ---- Audit log query ----
export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["timestamp", "action", "userId"]).default("timestamp"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().max(100).optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();
