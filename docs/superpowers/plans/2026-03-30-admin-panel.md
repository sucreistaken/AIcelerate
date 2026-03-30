# Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, RBAC-protected admin dashboard into the existing LearnCraft React+Express app with 9 feature modules.

**Architecture:** Feature-Sliced Admin under `web/src/admin/` with React Router for `/admin/*` routes only. Backend admin endpoints under `/api/admin/*` with `requirePermission` middleware. Each module is self-contained (page, components, hooks, services, types). Shared DataTable and FormBuilder components provide consistent CRUD patterns across all modules.

**Tech Stack:** React 19, TypeScript, Zustand, React Router DOM (already installed), Framer Motion, Zod, Express, BaseRepository (JSON storage)

**Spec:** `docs/superpowers/specs/2026-03-30-admin-panel-design.md`

---

## Phase 1: Backend Foundation

### Task 1: Admin Types & Permission System

**Files:**
- Create: `backend/types/admin.ts`

- [ ] **Step 1: Create admin types file**

```typescript
// backend/types/admin.ts

export type Permission =
  | "users:read" | "users:write" | "users:delete"
  | "courses:read" | "courses:write" | "courses:delete"
  | "lessons:read" | "lessons:write" | "lessons:delete"
  | "content:moderate"
  | "notifications:read" | "notifications:write"
  | "ai-stats:read"
  | "audit:read"
  | "settings:read" | "settings:write"
  | "roles:manage";

export const ALL_PERMISSIONS: Permission[] = [
  "users:read", "users:write", "users:delete",
  "courses:read", "courses:write", "courses:delete",
  "lessons:read", "lessons:write", "lessons:delete",
  "content:moderate",
  "notifications:read", "notifications:write",
  "ai-stats:read",
  "audit:read",
  "settings:read", "settings:write",
  "roles:manage",
];

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  rateLimitPerMinute: number;
  maxUploadSizeMb: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultRole: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalQuizPacks: number;
  recentActivity: AuditEntry[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: "role-admin",
    name: "admin",
    permissions: ALL_PERMISSIONS,
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-moderator",
    name: "moderator",
    permissions: [
      "users:read", "courses:read", "courses:write",
      "lessons:read", "lessons:write", "content:moderate",
      "notifications:read", "notifications:write", "audit:read",
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "role-viewer",
    name: "viewer",
    permissions: [
      "users:read", "courses:read", "lessons:read",
      "notifications:read", "ai-stats:read", "audit:read", "settings:read",
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors related to `types/admin.ts`

- [ ] **Step 3: Commit**

```bash
git add backend/types/admin.ts
git commit -m "feat(admin): add permission, role, and audit types"
```

---

### Task 2: Role Repository & Seeding

**Files:**
- Create: `backend/repositories/roleRepo.ts`

- [ ] **Step 1: Create role repository with default seeding**

```typescript
// backend/repositories/roleRepo.ts
import path from "path";
import { BaseRepository } from "./baseRepository";
import { Role, DEFAULT_ROLES } from "../types/admin";

class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super(path.join(__dirname, "..", "data", "roles.json"), DEFAULT_ROLES);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.findOneBy((r) => r.name === name);
  }
}

export const roleRepo = new RoleRepository();
```

- [ ] **Step 2: Verify file compiles and seed data is created**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/roleRepo.ts
git commit -m "feat(admin): add role repository with default seeding"
```

---

### Task 3: Audit Log Repository

**Files:**
- Create: `backend/repositories/auditRepo.ts`

- [ ] **Step 1: Create audit repository**

```typescript
// backend/repositories/auditRepo.ts
import path from "path";
import { BaseRepository } from "./baseRepository";
import { AuditEntry } from "../types/admin";

class AuditRepository extends BaseRepository<AuditEntry> {
  constructor() {
    super(path.join(__dirname, "..", "data", "audit-log.json"));
  }

  async findPaginated(params: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
  }): Promise<{ entries: AuditEntry[]; total: number }> {
    let all = await this.findAll();

    // Sort newest first
    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (params.userId) {
      all = all.filter((e) => e.userId === params.userId);
    }
    if (params.action) {
      all = all.filter((e) => e.action.startsWith(params.action!));
    }
    if (params.from) {
      const from = new Date(params.from).getTime();
      all = all.filter((e) => new Date(e.timestamp).getTime() >= from);
    }
    if (params.to) {
      const to = new Date(params.to).getTime();
      all = all.filter((e) => new Date(e.timestamp).getTime() <= to);
    }

    const total = all.length;
    const start = (params.page - 1) * params.limit;
    const entries = all.slice(start, start + params.limit);

    return { entries, total };
  }
}

export const auditRepo = new AuditRepository();
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/auditRepo.ts
git commit -m "feat(admin): add audit log repository"
```

---

### Task 4: Settings Repository

**Files:**
- Create: `backend/repositories/settingsRepo.ts`

- [ ] **Step 1: Create settings repository**

```typescript
// backend/repositories/settingsRepo.ts
import path from "path";
import { BaseRepository } from "./baseRepository";
import { SystemSettings } from "../types/admin";

const DEFAULT_SETTINGS: SystemSettings[] = [
  {
    id: "system",
    rateLimitPerMinute: 200,
    maxUploadSizeMb: 10,
    maintenanceMode: false,
    allowRegistration: true,
    defaultRole: "",
    updatedAt: new Date().toISOString(),
  },
];

class SettingsRepository extends BaseRepository<SystemSettings> {
  constructor() {
    super(path.join(__dirname, "..", "data", "settings.json"), DEFAULT_SETTINGS);
  }

  async getSettings(): Promise<SystemSettings> {
    const all = await this.findAll();
    return all[0] ?? DEFAULT_SETTINGS[0];
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates, id: "system", updatedAt: new Date().toISOString() };
    await this.upsert(updated);
    return updated;
  }
}

export const settingsRepo = new SettingsRepository();
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/settingsRepo.ts
git commit -m "feat(admin): add settings repository"
```

---

### Task 5: Extend User Model with Role Field

**Files:**
- Modify: `backend/models/User.ts:3-26` (IUser interface)
- Modify: `backend/models/User.ts:28-52` (userSchema)

- [ ] **Step 1: Add role field to IUser interface**

Add `role: string;` after `mutedRoomIds: string[];` at line 22 in the interface.

```typescript
// Add to IUser interface (after mutedRoomIds)
  role: string;
```

- [ ] **Step 2: Add role field to userSchema**

Add to the schema definition (after `mutedRoomIds`):

```typescript
    role: { type: String, default: "" },
```

- [ ] **Step 3: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add backend/models/User.ts
git commit -m "feat(admin): add role field to User model"
```

---

### Task 6: requirePermission Middleware

**Files:**
- Create: `backend/middleware/requirePermission.ts`

- [ ] **Step 1: Create permission middleware**

```typescript
// backend/middleware/requirePermission.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { Permission, ALL_PERMISSIONS } from "../types/admin";
import { roleRepo } from "../repositories/roleRepo";
import { forbidden } from "./errorHandler";

// In-memory cache for role lookups (cleared on role changes)
let roleCache: Map<string, Permission[]> | null = null;

export function clearRoleCache() {
  roleCache = null;
}

async function getPermissionsForRole(roleName: string): Promise<Permission[]> {
  if (!roleCache) {
    roleCache = new Map();
    const roles = await roleRepo.findAll();
    for (const role of roles) {
      roleCache.set(role.name, role.permissions);
    }
  }
  return roleCache.get(roleName) ?? [];
}

export function requirePermission(...required: Permission[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      return next(forbidden("Authentication required"));
    }

    // Get user's role from the database
    const { User } = await import("../models/User");
    const user = await User.findById(userId).lean();

    if (!user || !user.role) {
      return next(forbidden("No admin role assigned"));
    }

    const roleName = user.role;

    // Admin role bypasses all permission checks
    if (roleName === "admin") {
      return next();
    }

    const permissions = await getPermissionsForRole(roleName);
    const hasAll = required.every((p) => permissions.includes(p));

    if (!hasAll) {
      return next(forbidden(`Missing permission: ${required.join(", ")}`));
    }

    next();
  };
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/middleware/requirePermission.ts
git commit -m "feat(admin): add requirePermission middleware with role cache"
```

---

### Task 7: Audit Log Middleware

**Files:**
- Create: `backend/middleware/auditLog.ts`

- [ ] **Step 1: Create audit log middleware**

```typescript
// backend/middleware/auditLog.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { auditRepo } from "../repositories/auditRepo";
import { generateId } from "../utils/idGenerator";

export function auditLog(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Capture the original json method to log after response
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Only log successful operations
      if (body?.ok !== false && res.statusCode < 400) {
        const entry = {
          id: generateId("audit"),
          userId: req.user?.userId ?? "unknown",
          userEmail: "",
          action,
          resource: `${req.method} ${req.originalUrl}`,
          details: {
            params: req.params,
            body: sanitizeBody(req.body),
          },
          ip: req.ip || req.socket.remoteAddress || "unknown",
          timestamp: new Date().toISOString(),
        };

        // Fire-and-forget — don't block the response
        auditRepo.create(entry).catch((err) =>
          console.error("[AuditLog] Failed to write:", err)
        );
      }

      return originalJson(body);
    };

    next();
  };
}

/** Remove sensitive fields from request body before logging */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const sanitized = { ...body };
  const sensitiveKeys = ["password", "passwordHash", "token", "secret"];
  for (const key of sensitiveKeys) {
    if (key in sanitized) sanitized[key] = "[REDACTED]";
  }
  return sanitized;
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/middleware/auditLog.ts
git commit -m "feat(admin): add audit log middleware"
```

---

### Task 8: Admin Zod Validators

**Files:**
- Create: `backend/validators/adminSchemas.ts`

- [ ] **Step 1: Create admin validation schemas**

```typescript
// backend/validators/adminSchemas.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.string().min(1, "Role is required"),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  profile: z.object({
    nickname: z.string().min(1).optional(),
    avatar: z.string().optional(),
    department: z.string().optional(),
    bio: z.string().optional(),
  }).optional(),
  status: z.enum(["online", "idle", "dnd", "offline"]).optional(),
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.array(z.string()).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateSettingsSchema = z.object({
  rateLimitPerMinute: z.number().int().min(10).max(10000).optional(),
  maxUploadSizeMb: z.number().int().min(1).max(100).optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
  defaultRole: z.string().optional(),
});

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  targetUserIds: z.array(z.string()).optional(), // empty = broadcast
  type: z.enum(["info", "warning", "success"]).default("info"),
});

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().optional(),
  action: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add backend/validators/adminSchemas.ts
git commit -m "feat(admin): add Zod validation schemas for admin endpoints"
```

---

### Task 9: Admin Controller

**Files:**
- Create: `backend/controllers/adminController.ts`

- [ ] **Step 1: Create admin controller with all handlers**

```typescript
// backend/controllers/adminController.ts
import { User } from "../models/User";
import { roleRepo } from "../repositories/roleRepo";
import { auditRepo } from "../repositories/auditRepo";
import { settingsRepo } from "../repositories/settingsRepo";
import { generateId } from "../utils/idGenerator";
import { clearRoleCache } from "../middleware/requirePermission";
import { AppError, notFound, badRequest, conflict } from "../middleware/errorHandler";
import type { PaginationParams } from "../types/admin";

// Use dynamic imports for repos that may use either JSON or MongoDB
async function getLessonRepo() {
  const mod = await import("../repositories/lessonRepo");
  return mod.lessonRepo;
}
async function getCourseRepo() {
  const mod = await import("../repositories/courseRepo");
  return mod.courseRepo;
}

// ──────────── Dashboard Stats ────────────

export async function getStats() {
  const [userCount, courseRepo, lessonRepo, recentAudit] = await Promise.all([
    User.countDocuments().catch(() => 0),
    getCourseRepo(),
    getLessonRepo(),
    auditRepo.findPaginated({ page: 1, limit: 10 }),
  ]);

  const courses = await courseRepo.findAll();
  const lessons = await lessonRepo.findAll();

  return {
    totalUsers: userCount || 0,
    totalCourses: courses.length,
    totalLessons: lessons.length,
    totalQuizPacks: 0,
    recentActivity: recentAudit.entries,
  };
}

// ──────────── Users ────────────

export async function listUsers(params: PaginationParams) {
  const { page, limit, search, sortBy = "createdAt", sortDir = "desc" } = params;

  let query: Record<string, any> = {};
  if (search) {
    query = {
      $or: [
        { email: { $regex: search, $options: "i" } },
        { "profile.nickname": { $regex: search, $options: "i" } },
      ],
    };
  }

  const total = await User.countDocuments(query).catch(() => 0);
  const users = await User.find(query)
    .select("-passwordHash")
    .sort({ [sortBy]: sortDir === "asc" ? 1 : -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .catch(() => []);

  return { data: users, total, page, limit };
}

export async function getUser(id: string) {
  const user = await User.findById(id).select("-passwordHash").lean();
  if (!user) throw notFound("User not found");
  return user;
}

export async function updateUser(id: string, updates: Record<string, any>) {
  const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true })
    .select("-passwordHash")
    .lean();
  if (!user) throw notFound("User not found");
  return user;
}

export async function setUserRole(id: string, roleName: string) {
  // Validate role exists
  if (roleName) {
    const role = await roleRepo.findByName(roleName);
    if (!role) throw badRequest(`Role "${roleName}" does not exist`);
  }

  const user = await User.findByIdAndUpdate(id, { $set: { role: roleName } }, { new: true })
    .select("-passwordHash")
    .lean();
  if (!user) throw notFound("User not found");
  return user;
}

export async function deleteUser(id: string) {
  const result = await User.findByIdAndDelete(id);
  if (!result) throw notFound("User not found");
  return { ok: true };
}

// ──────────── Courses ────────────

export async function listCourses(params: PaginationParams) {
  const courseRepo = await getCourseRepo();
  let all = await courseRepo.findAll();

  if (params.search) {
    const s = params.search.toLowerCase();
    all = all.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(s) ||
        c.code?.toLowerCase().includes(s)
    );
  }

  const total = all.length;

  // Sort
  if (params.sortBy) {
    all.sort((a: any, b: any) => {
      const aVal = a[params.sortBy!] ?? "";
      const bVal = b[params.sortBy!] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return params.sortDir === "desc" ? -cmp : cmp;
    });
  }

  const start = (params.page - 1) * params.limit;
  const data = all.slice(start, start + params.limit);

  return { data, total, page: params.page, limit: params.limit };
}

export async function deleteCourse(id: string) {
  const courseRepo = await getCourseRepo();
  const deleted = await courseRepo.delete(id);
  if (!deleted) throw notFound("Course not found");
  return { ok: true };
}

// ──────────── Lessons ────────────

export async function listLessons(params: PaginationParams) {
  const lessonRepo = await getLessonRepo();
  let all = await lessonRepo.findAll();

  if (params.search) {
    const s = params.search.toLowerCase();
    all = all.filter((l: any) => l.title?.toLowerCase().includes(s));
  }

  const total = all.length;

  if (params.sortBy) {
    all.sort((a: any, b: any) => {
      const aVal = a[params.sortBy!] ?? "";
      const bVal = b[params.sortBy!] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return params.sortDir === "desc" ? -cmp : cmp;
    });
  }

  const start = (params.page - 1) * params.limit;
  const data = all.slice(start, start + params.limit);

  return { data, total, page: params.page, limit: params.limit };
}

export async function deleteLesson(id: string) {
  const lessonRepo = await getLessonRepo();
  const deleted = await lessonRepo.delete(id);
  if (!deleted) throw notFound("Lesson not found");
  return { ok: true };
}

// ──────────── Roles ────────────

export async function listRoles() {
  return roleRepo.findAll();
}

export async function createRole(data: { name: string; permissions: string[] }) {
  const existing = await roleRepo.findByName(data.name);
  if (existing) throw conflict(`Role "${data.name}" already exists`);

  const role = {
    id: generateId("role"),
    name: data.name,
    permissions: data.permissions as any[],
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await roleRepo.create(role);
  clearRoleCache();
  return role;
}

export async function updateRole(id: string, updates: { name?: string; permissions?: string[] }) {
  const role = await roleRepo.findById(id);
  if (!role) throw notFound("Role not found");
  if (role.isSystem && updates.name) throw badRequest("Cannot rename system role");

  const updated = await roleRepo.update(id, {
    ...updates,
    permissions: updates.permissions as any,
    updatedAt: new Date().toISOString(),
  });

  clearRoleCache();
  return updated;
}

export async function deleteRole(id: string) {
  const role = await roleRepo.findById(id);
  if (!role) throw notFound("Role not found");
  if (role.isSystem) throw badRequest("Cannot delete system role");

  await roleRepo.delete(id);
  clearRoleCache();
  return { ok: true };
}

// ──────────── Audit Log ────────────

export async function getAuditLog(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}) {
  const { entries, total } = await auditRepo.findPaginated(params);
  return { data: entries, total, page: params.page, limit: params.limit };
}

// ──────────── Settings ────────────

export async function getSettings() {
  return settingsRepo.getSettings();
}

export async function updateSettings(updates: Record<string, any>) {
  return settingsRepo.updateSettings(updates);
}

// ──────────── Notifications (admin send) ────────────

export async function sendNotification(data: {
  title: string;
  message: string;
  targetUserIds?: string[];
  type: string;
}) {
  // Use existing notification repo
  const notifRepo = await import("../repositories/notificationRepo").then(
    (m) => m.notificationRepo
  ).catch(() => null);

  if (!notifRepo) {
    return { ok: true, sent: 0, message: "Notification system not available" };
  }

  const notification = {
    id: generateId("notif"),
    ...data,
    createdAt: new Date().toISOString(),
    read: false,
  };

  await notifRepo.create(notification as any);
  return { ok: true, sent: 1, notification };
}
```

- [ ] **Step 2: Verify compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: May have import warnings for dynamic repos — fix any path issues.

- [ ] **Step 3: Commit**

```bash
git add backend/controllers/adminController.ts
git commit -m "feat(admin): add admin controller with all CRUD handlers"
```

---

### Task 10: Admin Routes

**Files:**
- Create: `backend/routes/adminRoutes.ts`
- Modify: `backend/routes/index.ts:67` (add admin route mount)

- [ ] **Step 1: Create admin routes file**

```typescript
// backend/routes/adminRoutes.ts
import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { auditLog } from "../middleware/auditLog";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import * as admin from "../controllers/adminController";
import {
  paginationSchema,
  updateUserRoleSchema,
  updateUserSchema,
  createRoleSchema,
  updateRoleSchema,
  updateSettingsSchema,
  sendNotificationSchema,
  auditLogQuerySchema,
} from "../validators/adminSchemas";

const router = Router();

// All admin routes require authentication
router.use(requireAuth);

// ── Dashboard ──
router.get(
  "/stats",
  requirePermission("users:read"),
  asyncHandler(async (_req, res) => {
    const stats = await admin.getStats();
    res.json({ ok: true, ...stats });
  })
);

// ── Users ──
router.get(
  "/users",
  requirePermission("users:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listUsers(params);
    res.json({ ok: true, ...result });
  })
);

router.get(
  "/users/:id",
  requirePermission("users:read"),
  asyncHandler(async (req, res) => {
    const user = await admin.getUser(req.params.id);
    res.json({ ok: true, data: user });
  })
);

router.patch(
  "/users/:id",
  requirePermission("users:write"),
  validate(updateUserSchema),
  auditLog("user.update"),
  asyncHandler(async (req, res) => {
    const user = await admin.updateUser(req.params.id, req.body);
    res.json({ ok: true, data: user });
  })
);

router.patch(
  "/users/:id/role",
  requirePermission("roles:manage"),
  validate(updateUserRoleSchema),
  auditLog("user.role.assign"),
  asyncHandler(async (req, res) => {
    const user = await admin.setUserRole(req.params.id, req.body.role);
    res.json({ ok: true, data: user });
  })
);

router.delete(
  "/users/:id",
  requirePermission("users:delete"),
  auditLog("user.delete"),
  asyncHandler(async (req, res) => {
    await admin.deleteUser(req.params.id);
    res.json({ ok: true });
  })
);

// ── Courses ──
router.get(
  "/courses",
  requirePermission("courses:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listCourses(params);
    res.json({ ok: true, ...result });
  })
);

router.delete(
  "/courses/:id",
  requirePermission("courses:delete"),
  auditLog("course.delete"),
  asyncHandler(async (req, res) => {
    await admin.deleteCourse(req.params.id);
    res.json({ ok: true });
  })
);

// ── Lessons ──
router.get(
  "/lessons",
  requirePermission("lessons:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listLessons(params);
    res.json({ ok: true, ...result });
  })
);

router.delete(
  "/lessons/:id",
  requirePermission("lessons:delete"),
  auditLog("lesson.delete"),
  asyncHandler(async (req, res) => {
    await admin.deleteLesson(req.params.id);
    res.json({ ok: true });
  })
);

// ── Roles ──
router.get(
  "/roles",
  requirePermission("roles:manage"),
  asyncHandler(async (_req, res) => {
    const roles = await admin.listRoles();
    res.json({ ok: true, data: roles });
  })
);

router.post(
  "/roles",
  requirePermission("roles:manage"),
  validate(createRoleSchema),
  auditLog("role.create"),
  asyncHandler(async (req, res) => {
    const role = await admin.createRole(req.body);
    res.status(201).json({ ok: true, data: role });
  })
);

router.patch(
  "/roles/:id",
  requirePermission("roles:manage"),
  validate(updateRoleSchema),
  auditLog("role.update"),
  asyncHandler(async (req, res) => {
    const role = await admin.updateRole(req.params.id, req.body);
    res.json({ ok: true, data: role });
  })
);

router.delete(
  "/roles/:id",
  requirePermission("roles:manage"),
  auditLog("role.delete"),
  asyncHandler(async (req, res) => {
    await admin.deleteRole(req.params.id);
    res.json({ ok: true });
  })
);

// ── Audit Log ──
router.get(
  "/audit-log",
  requirePermission("audit:read"),
  asyncHandler(async (req, res) => {
    const params = auditLogQuerySchema.parse(req.query);
    const result = await admin.getAuditLog(params);
    res.json({ ok: true, ...result });
  })
);

// ── Notifications ──
router.post(
  "/notifications",
  requirePermission("notifications:write"),
  validate(sendNotificationSchema),
  auditLog("notification.send"),
  asyncHandler(async (req, res) => {
    const result = await admin.sendNotification(req.body);
    res.json(result);
  })
);

// ── Settings ──
router.get(
  "/settings",
  requirePermission("settings:read"),
  asyncHandler(async (_req, res) => {
    const settings = await admin.getSettings();
    res.json({ ok: true, data: settings });
  })
);

router.patch(
  "/settings",
  requirePermission("settings:write"),
  validate(updateSettingsSchema),
  auditLog("settings.update"),
  asyncHandler(async (req, res) => {
    const settings = await admin.updateSettings(req.body);
    res.json({ ok: true, data: settings });
  })
);

export default router;
```

- [ ] **Step 2: Mount admin routes in main router**

In `backend/routes/index.ts`, add after the gamification routes import (line 16):

```typescript
import adminRoutes from "./adminRoutes";
```

And before `export default router;` (line 67), add:

```typescript
// Admin panel
router.use("/api/admin", adminRoutes);
```

- [ ] **Step 3: Verify compiles**

Run: `cd backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add backend/routes/adminRoutes.ts backend/routes/index.ts
git commit -m "feat(admin): add admin routes with permission + audit middleware"
```

---

## Phase 2: Frontend Foundation

### Task 11: Admin Types (Frontend)

**Files:**
- Create: `web/src/admin/types/permissions.ts`
- Create: `web/src/admin/types/index.ts`

- [ ] **Step 1: Create permission types (shared with backend)**

```typescript
// web/src/admin/types/permissions.ts

export type Permission =
  | "users:read" | "users:write" | "users:delete"
  | "courses:read" | "courses:write" | "courses:delete"
  | "lessons:read" | "lessons:write" | "lessons:delete"
  | "content:moderate"
  | "notifications:read" | "notifications:write"
  | "ai-stats:read"
  | "audit:read"
  | "settings:read" | "settings:write"
  | "roles:manage";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  rateLimitPerMinute: number;
  maxUploadSizeMb: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultRole: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalQuizPacks: number;
  recentActivity: AuditEntry[];
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TableParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Create index barrel export**

```typescript
// web/src/admin/types/index.ts
export * from "./permissions";
```

- [ ] **Step 3: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add web/src/admin/types/
git commit -m "feat(admin): add frontend admin types and permissions"
```

---

### Task 12: Admin API Client

**Files:**
- Create: `web/src/admin/services/adminApi.ts`

- [ ] **Step 1: Create admin API client**

```typescript
// web/src/admin/services/adminApi.ts
import { API_BASE } from "../../config";
import toast from "react-hot-toast";

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
  code?: string;
}

function getHeaders(): HeadersInit {
  const token = localStorage.getItem("lc_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const json = await res.json();

  if (!res.ok || json.ok === false) {
    const message = json.error || `Request failed (${res.status})`;
    toast.error(message);
    throw new Error(message);
  }

  return json;
}

export const adminApi = {
  async get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(`${API_BASE}/api/admin${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      });
    }
    const res = await fetch(url.toString(), { headers: getHeaders() });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: "POST",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },

  async del<T>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse<T>(res);
  },
};
```

- [ ] **Step 2: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add web/src/admin/services/adminApi.ts
git commit -m "feat(admin): add admin API client with toast error handling"
```

---

### Task 13: Permission Hooks & PermissionGate

**Files:**
- Create: `web/src/admin/hooks/usePermission.ts`
- Create: `web/src/admin/components/PermissionGate.tsx`

- [ ] **Step 1: Create permission hooks**

```typescript
// web/src/admin/hooks/usePermission.ts
import { useAuthStore } from "../../stores/authStore";
import type { Permission, Role } from "../types";
import { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi";

// Cache roles in memory for the session
let rolesCache: Role[] | null = null;

export function useAdminRoles(): { roles: Role[]; loading: boolean } {
  const [roles, setRoles] = useState<Role[]>(rolesCache ?? []);
  const [loading, setLoading] = useState(!rolesCache);

  useEffect(() => {
    if (rolesCache) return;
    adminApi.get<Role[]>("/roles").then((res) => {
      rolesCache = res.data ?? [];
      setRoles(rolesCache);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { roles, loading };
}

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  const { roles } = useAdminRoles();

  if (!user || !(user as any).role) return false;

  const roleName = (user as any).role;
  if (roleName === "admin") return true;

  const role = roles.find((r) => r.name === roleName);
  if (!role) return false;

  return role.permissions.includes(permission);
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user);
  const { roles } = useAdminRoles();

  if (!user || !(user as any).role) return false;

  const roleName = (user as any).role;
  if (roleName === "admin") return true;

  const role = roles.find((r) => r.name === roleName);
  if (!role) return false;

  return permissions.some((p) => role.permissions.includes(p));
}

export function useIsAdmin(): boolean {
  const user = useAuthStore((s) => s.user);
  return !!(user && (user as any).role);
}
```

- [ ] **Step 2: Create PermissionGate component**

```typescript
// web/src/admin/components/PermissionGate.tsx
import type { ReactNode } from "react";
import { usePermission } from "../hooks/usePermission";
import type { Permission } from "../types";

interface Props {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: Props) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}
```

- [ ] **Step 3: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add web/src/admin/hooks/usePermission.ts web/src/admin/components/PermissionGate.tsx
git commit -m "feat(admin): add permission hooks and PermissionGate component"
```

---

### Task 14: Module Registry

**Files:**
- Create: `web/src/admin/registry.ts`

- [ ] **Step 1: Create module registry**

```typescript
// web/src/admin/registry.ts
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  Shield, Bell, BarChart3, FileText, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "./types";

export type ModuleGroup = "management" | "content" | "analytics" | "system";

export interface AdminModule {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  permission: Permission;
  group: ModuleGroup;
}

export const MODULE_GROUPS: Record<ModuleGroup, string> = {
  management: "Yönetim",
  content: "İçerik",
  analytics: "Analitik",
  system: "Sistem",
};

export const adminModules: AdminModule[] = [
  { id: "dashboard",    label: "Dashboard",       icon: LayoutDashboard, path: "/admin",                    permission: "users:read",          group: "management" },
  { id: "users",        label: "Kullanıcılar",    icon: Users,           path: "/admin/users",              permission: "users:read",          group: "management" },
  { id: "courses",      label: "Kurslar",         icon: BookOpen,        path: "/admin/courses",            permission: "courses:read",        group: "management" },
  { id: "lessons",      label: "Dersler",         icon: GraduationCap,   path: "/admin/lessons",            permission: "lessons:read",        group: "management" },
  { id: "moderation",   label: "Moderasyon",      icon: Shield,          path: "/admin/content-moderation", permission: "content:moderate",     group: "content"    },
  { id: "notifications",label: "Bildirimler",     icon: Bell,            path: "/admin/notifications",      permission: "notifications:read",  group: "content"    },
  { id: "ai-stats",     label: "AI İstatistik",   icon: BarChart3,       path: "/admin/ai-stats",           permission: "ai-stats:read",       group: "analytics"  },
  { id: "audit",        label: "Audit Log",        icon: FileText,        path: "/admin/audit-log",          permission: "audit:read",          group: "analytics"  },
  { id: "settings",     label: "Ayarlar",         icon: Settings,        path: "/admin/settings",           permission: "settings:read",       group: "system"     },
];
```

- [ ] **Step 2: Commit**

```bash
git add web/src/admin/registry.ts
git commit -m "feat(admin): add module registry for sidebar and routes"
```

---

### Task 15: Admin Layout, Sidebar, Topbar

**Files:**
- Create: `web/src/admin/components/AdminLayout.tsx`
- Create: `web/src/admin/components/AdminSidebar.tsx`
- Create: `web/src/admin/components/AdminTopbar.tsx`
- Create: `web/src/admin/styles/admin-layout.css`
- Create: `web/src/admin/styles/admin-sidebar.css`

- [ ] **Step 1: Create AdminSidebar**

```tsx
// web/src/admin/components/AdminSidebar.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ArrowLeft } from "lucide-react";
import { adminModules, MODULE_GROUPS, type ModuleGroup } from "../registry";
import { usePermission } from "../hooks/usePermission";
import type { Permission } from "../types";
import "../styles/admin-sidebar.css";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

function SidebarItem({ module, active, collapsed, onClick }: {
  module: typeof adminModules[0];
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const hasPermission = usePermission(module.permission);
  if (!hasPermission) return null;

  const Icon = module.icon;

  return (
    <button
      className={`admin-sidebar__item${active ? " admin-sidebar__item--active" : ""}`}
      onClick={onClick}
      title={collapsed ? module.label : undefined}
    >
      <Icon size={20} />
      {!collapsed && <span>{module.label}</span>}
    </button>
  );
}

export function AdminSidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const groups = (["management", "content", "analytics", "system"] as ModuleGroup[]).map((group) => ({
    key: group,
    label: MODULE_GROUPS[group],
    items: adminModules.filter((m) => m.group === group),
  }));

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`admin-sidebar${collapsed ? " admin-sidebar--collapsed" : ""}`}>
      <div className="admin-sidebar__content">
        {groups.map((group) => (
          <div key={group.key} className="admin-sidebar__group">
            {!collapsed && (
              <div className="admin-sidebar__group-label">{group.label}</div>
            )}
            {group.items.map((module) => (
              <SidebarItem
                key={module.id}
                module={module}
                active={isActive(module.path)}
                collapsed={collapsed}
                onClick={() => navigate(module.path)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="admin-sidebar__footer">
        <button
          className="admin-sidebar__item"
          onClick={() => { window.location.href = "/"; }}
        >
          <ArrowLeft size={20} />
          {!collapsed && <span>Uygulamaya Dön</span>}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create AdminTopbar**

```tsx
// web/src/admin/components/AdminTopbar.tsx
import { Menu, Bell, LogOut, Sun, Moon } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useUIStore } from "../../stores/uiStore";
import "../styles/admin-layout.css";

interface Props {
  onToggleSidebar: () => void;
}

export function AdminTopbar({ onToggleSidebar }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <button className="admin-topbar__toggle" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>
        <h1 className="admin-topbar__title">LearnCraft Admin</h1>
      </div>

      <div className="admin-topbar__right">
        <button
          className="admin-topbar__icon-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Tema değiştir"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="admin-topbar__user">
          <span className="admin-topbar__user-name">
            {user?.profile?.nickname || user?.email || "Admin"}
          </span>
          <button className="admin-topbar__icon-btn" onClick={logout} title="Çıkış">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create AdminLayout**

```tsx
// web/src/admin/components/AdminLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import "../styles/admin-layout.css";

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-layout">
      <AdminTopbar onToggleSidebar={() => setCollapsed((c) => !c)} />
      <div className="admin-layout__body">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="admin-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create admin-layout.css**

```css
/* web/src/admin/styles/admin-layout.css */

.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  color: var(--text-primary);
}

.admin-layout__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.admin-layout__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

/* ── Topbar ── */

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-4);
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: var(--z-sticky, 20);
}

.admin-topbar__left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.admin-topbar__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
}
.admin-topbar__toggle:hover {
  background: var(--surface-3);
}

.admin-topbar__title {
  font-size: var(--text-lg, 18px);
  font-weight: var(--font-semibold, 600);
  color: var(--text-primary);
  margin: 0;
}

.admin-topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.admin-topbar__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
}
.admin-topbar__icon-btn:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}

.admin-topbar__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-topbar__user-name {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
}
```

- [ ] **Step 5: Create admin-sidebar.css**

```css
/* web/src/admin/styles/admin-sidebar.css */

.admin-sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
  transition: width var(--duration-base, 200ms) var(--ease-out, ease-out);
  flex-shrink: 0;
  overflow: hidden;
}

.admin-sidebar--collapsed {
  width: 64px;
}

.admin-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.admin-sidebar__group {
  margin-bottom: var(--space-4);
}

.admin-sidebar__group-label {
  font-size: var(--text-xs, 12px);
  font-weight: var(--font-semibold, 600);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide, 0.5px);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
}

.admin-sidebar__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-sm, 14px);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: all var(--duration-fast, 150ms);
  text-align: left;
  white-space: nowrap;
}

.admin-sidebar__item:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}

.admin-sidebar__item--active {
  background: var(--accent-soft, rgba(99, 102, 241, 0.1));
  color: var(--accent, #6366f1);
  font-weight: var(--font-medium, 500);
}

.admin-sidebar__footer {
  padding: var(--space-2);
  border-top: 1px solid var(--border);
}

/* Collapsed state — center icons */
.admin-sidebar--collapsed .admin-sidebar__item {
  justify-content: center;
  padding: var(--space-2);
}

.admin-sidebar--collapsed .admin-sidebar__group-label {
  display: none;
}

/* Mobile overlay */
@media (max-width: 768px) {
  .admin-sidebar {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: var(--z-overlay, 100);
    width: 240px;
    transform: translateX(-100%);
    transition: transform var(--duration-base, 200ms);
  }
  .admin-sidebar:not(.admin-sidebar--collapsed) {
    transform: translateX(0);
  }
}
```

- [ ] **Step 6: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add web/src/admin/components/AdminLayout.tsx web/src/admin/components/AdminSidebar.tsx web/src/admin/components/AdminTopbar.tsx web/src/admin/styles/
git commit -m "feat(admin): add admin layout shell with sidebar and topbar"
```

---

### Task 16: Shared Page Components

**Files:**
- Create: `web/src/admin/components/PageContainer.tsx`
- Create: `web/src/admin/components/PageHeader.tsx`
- Create: `web/src/admin/components/EmptyState.tsx`
- Create: `web/src/admin/components/StatCard.tsx`

- [ ] **Step 1: Create PageContainer + PageHeader**

```tsx
// web/src/admin/components/PageContainer.tsx
import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="admin-page">{children}</div>;
}

export function PageContent({ children }: { children: ReactNode }) {
  return <div className="admin-page__content">{children}</div>;
}
```

```tsx
// web/src/admin/components/PageHeader.tsx
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="admin-page__header">
      <div>
        <h2 className="admin-page__title">{title}</h2>
        {subtitle && <p className="admin-page__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="admin-page__actions">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create EmptyState**

```tsx
// web/src/admin/components/EmptyState.tsx
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  message: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, description, action }: Props) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__icon">{icon ?? <Inbox size={48} />}</div>
      <h3 className="admin-empty__message">{message}</h3>
      {description && <p className="admin-empty__description">{description}</p>}
      {action && <div className="admin-empty__action">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create StatCard**

```tsx
// web/src/admin/components/StatCard.tsx
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: string;
}

export function StatCard({ label, value, icon: Icon, trend, color }: Props) {
  return (
    <div className="admin-stat-card" style={color ? { borderLeftColor: color } : undefined}>
      <div className="admin-stat-card__header">
        <span className="admin-stat-card__label">{label}</span>
        <Icon size={20} className="admin-stat-card__icon" />
      </div>
      <div className="admin-stat-card__value">{value}</div>
      {trend && (
        <div className={`admin-stat-card__trend ${trend.value >= 0 ? "admin-stat-card__trend--up" : "admin-stat-card__trend--down"}`}>
          {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create admin-components.css**

```css
/* web/src/admin/styles/admin-components.css */

/* ── Page Layout ── */
.admin-page {
  max-width: 1200px;
  margin: 0 auto;
}

.admin-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-6);
  gap: var(--space-4);
}

.admin-page__title {
  font-size: var(--text-2xl, 24px);
  font-weight: var(--font-bold, 700);
  color: var(--text-primary);
  margin: 0;
}

.admin-page__subtitle {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
  margin: var(--space-1) 0 0;
}

.admin-page__actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.admin-page__content {
  margin-top: var(--space-4);
}

/* ── Empty State ── */
.admin-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-4);
  text-align: center;
}

.admin-empty__icon {
  color: var(--text-tertiary);
  margin-bottom: var(--space-4);
}

.admin-empty__message {
  font-size: var(--text-lg, 18px);
  font-weight: var(--font-semibold, 600);
  color: var(--text-primary);
  margin: 0;
}

.admin-empty__description {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
  margin: var(--space-2) 0 0;
}

.admin-empty__action {
  margin-top: var(--space-4);
}

/* ── Stat Card ── */
.admin-stat-card {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent, #6366f1);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-5);
  transition: box-shadow var(--duration-fast, 150ms);
}
.admin-stat-card:hover {
  box-shadow: var(--shadow-md);
}

.admin-stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.admin-stat-card__label {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
  font-weight: var(--font-medium, 500);
}

.admin-stat-card__icon {
  color: var(--text-tertiary);
}

.admin-stat-card__value {
  font-size: var(--text-3xl, 28px);
  font-weight: var(--font-bold, 700);
  color: var(--text-primary);
  line-height: 1;
}

.admin-stat-card__trend {
  font-size: var(--text-xs, 12px);
  margin-top: var(--space-2);
}

.admin-stat-card__trend--up { color: var(--color-success, #22c55e); }
.admin-stat-card__trend--down { color: var(--color-danger, #ef4444); }
```

- [ ] **Step 5: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add web/src/admin/components/PageContainer.tsx web/src/admin/components/PageHeader.tsx web/src/admin/components/EmptyState.tsx web/src/admin/components/StatCard.tsx web/src/admin/styles/admin-components.css
git commit -m "feat(admin): add shared page components (PageHeader, StatCard, EmptyState)"
```

---

### Task 17: DataTable Component

**Files:**
- Create: `web/src/admin/components/DataTable.tsx`
- Create: `web/src/admin/hooks/useTableState.ts`
- Create: `web/src/admin/hooks/useTableData.ts`
- Create: `web/src/admin/styles/admin-table.css`

- [ ] **Step 1: Create useTableState hook**

```typescript
// web/src/admin/hooks/useTableState.ts
import { useState, useCallback } from "react";
import type { TableParams } from "../types";

export function useTableState(defaults?: Partial<TableParams>) {
  const [page, setPage] = useState(defaults?.page ?? 1);
  const [limit] = useState(defaults?.limit ?? 20);
  const [sortBy, setSortByState] = useState(defaults?.sortBy ?? "");
  const [sortDir, setSortDirState] = useState<"asc" | "desc">(defaults?.sortDir ?? "desc");
  const [search, setSearch] = useState(defaults?.search ?? "");

  const setSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortDirState((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortByState(key);
      setSortDirState("asc");
    }
    setPage(1);
  }, [sortBy]);

  const resetFilters = useCallback(() => {
    setPage(1);
    setSortByState("");
    setSortDirState("desc");
    setSearch("");
  }, []);

  const params: TableParams = { page, limit, sortBy, sortDir, search };

  return { page, limit, sortBy, sortDir, search, params, setPage, setSort, setSearch, resetFilters };
}
```

- [ ] **Step 2: Create useTableData hook**

```typescript
// web/src/admin/hooks/useTableData.ts
import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../services/adminApi";
import type { TableParams } from "../types";

interface UseTableDataResult<T> {
  data: T[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTableData<T>(endpoint: string, params: TableParams): UseTableDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const cleanParams: Record<string, unknown> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") cleanParams[k] = v;
    });

    adminApi.get<T[]>(endpoint, cleanParams)
      .then((res) => {
        if (cancelled) return;
        setData(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [endpoint, params.page, params.limit, params.sortBy, params.sortDir, params.search, refreshKey]);

  return { data, total, isLoading, error, refetch };
}
```

- [ ] **Step 3: Create DataTable component**

```tsx
// web/src/admin/components/DataTable.tsx
import { type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "./EmptyState";
import "../styles/admin-table.css";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  width?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface SortingProps {
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pagination: PaginationProps;
  sorting?: SortingProps;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T) => string;
}

export function DataTable<T>({
  data, columns, pagination, sorting, loading, emptyMessage, onRowClick, keyExtractor,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading) {
    return (
      <div className="admin-table__loading">
        <Spinner size="md" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState message={emptyMessage ?? "Veri bulunamadı"} />;
  }

  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  };

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={col.sortable ? "admin-table__th--sortable" : ""}
                onClick={col.sortable && sorting ? () => sorting.onSort(col.key) : undefined}
              >
                <span className="admin-table__th-content">
                  {col.label}
                  {col.sortable && sorting && (
                    <span className="admin-table__sort-icon">
                      {sorting.sortBy === col.key ? (
                        sorting.sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={keyExtractor ? keyExtractor(item) : idx}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={onRowClick ? "admin-table__row--clickable" : ""}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item) : String(getNestedValue(item, col.key) ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="admin-table__pagination">
          <span className="admin-table__pagination-info">
            {((pagination.page - 1) * pagination.pageSize) + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </span>
          <div className="admin-table__pagination-buttons">
            <button
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Önceki
            </button>
            <span>{pagination.page} / {totalPages}</span>
            <button
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create admin-table.css**

```css
/* web/src/admin/styles/admin-table.css */

.admin-table-wrapper {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs, 12px);
  font-weight: var(--font-semibold, 600);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide, 0.5px);
  background: var(--surface-3);
  border-bottom: 1px solid var(--border);
  user-select: none;
}

.admin-table__th--sortable {
  cursor: pointer;
}
.admin-table__th--sortable:hover {
  color: var(--text-primary);
}

.admin-table__th-content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.admin-table__sort-icon {
  color: var(--text-tertiary);
}

.admin-table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm, 14px);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.admin-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-table tbody tr:hover {
  background: var(--surface-3);
}

.admin-table__row--clickable {
  cursor: pointer;
}

.admin-table__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
}

/* ── Pagination ── */
.admin-table__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border);
  background: var(--surface-3);
}

.admin-table__pagination-info {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
}

.admin-table__pagination-buttons {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-table__pagination-buttons button {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm, 14px);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-primary);
  border-radius: var(--radius-sm, 8px);
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
}

.admin-table__pagination-buttons button:hover:not(:disabled) {
  background: var(--surface-3);
}

.admin-table__pagination-buttons button:disabled {
  opacity: 0.4;
  cursor: default;
}

.admin-table__pagination-buttons span {
  font-size: var(--text-sm, 14px);
  color: var(--text-secondary);
  padding: 0 var(--space-2);
}
```

- [ ] **Step 5: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add web/src/admin/components/DataTable.tsx web/src/admin/hooks/useTableState.ts web/src/admin/hooks/useTableData.ts web/src/admin/styles/admin-table.css
git commit -m "feat(admin): add generic DataTable component with pagination and sorting"
```

---

### Task 18: FormBuilder Component

**Files:**
- Create: `web/src/admin/components/FormBuilder.tsx`
- Create: `web/src/admin/hooks/useForm.ts`
- Create: `web/src/admin/styles/admin-form.css`

- [ ] **Step 1: Create useForm hook**

```typescript
// web/src/admin/hooks/useForm.ts
import { useState, useCallback, useMemo } from "react";
import type { ZodSchema, ZodError } from "zod";

interface UseFormResult<T> {
  values: T;
  errors: Record<string, string>;
  isDirty: boolean;
  isSubmitting: boolean;
  handleChange: (name: string, value: unknown) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newDefaults?: Partial<T>) => void;
}

export function useForm<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  defaultValues: Partial<T>,
  onSubmit: (data: T) => Promise<void>
): UseFormResult<T> {
  const [values, setValues] = useState<T>(defaultValues as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues] = useState(defaultValues);

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues]
  );

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => {
      const parts = name.split(".");
      if (parts.length === 1) {
        return { ...prev, [name]: value };
      }
      // Handle nested: "profile.nickname"
      const copy = { ...prev } as any;
      let ref = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        ref[parts[i]] = { ...ref[parts[i]] };
        ref = ref[parts[i]];
      }
      ref[parts[parts.length - 1]] = value;
      return copy;
    });
    // Clear error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrors({});

    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      (result.error as ZodError).issues.forEach((issue) => {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } finally {
      setIsSubmitting(false);
    }
  }, [schema, values, onSubmit]);

  const reset = useCallback((newDefaults?: Partial<T>) => {
    setValues((newDefaults ?? defaultValues) as T);
    setErrors({});
  }, [defaultValues]);

  return { values, errors, isDirty, isSubmitting, handleChange, handleSubmit, reset };
}
```

- [ ] **Step 2: Create FormBuilder component**

```tsx
// web/src/admin/components/FormBuilder.tsx
import type { ZodSchema } from "zod";
import { useForm } from "../hooks/useForm";
import { Button } from "../../components/ui/Button";
import "../styles/admin-form.css";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "select" | "switch" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  disabled?: boolean;
}

interface FormBuilderProps<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => Promise<void>;
  fields: FieldConfig[];
  submitLabel?: string;
  layout?: "vertical" | "two-column";
}

export function FormBuilder<T extends Record<string, any>>({
  schema, defaultValues, onSubmit, fields, submitLabel = "Kaydet", layout = "vertical",
}: FormBuilderProps<T>) {
  const { values, errors, isDirty, isSubmitting, handleChange, handleSubmit } = useForm<T>(
    schema, defaultValues ?? ({} as Partial<T>), onSubmit
  );

  const getNestedValue = (obj: any, path: string) =>
    path.split(".").reduce((acc, key) => acc?.[key], obj);

  const renderField = (field: FieldConfig) => {
    const value = getNestedValue(values, field.name);
    const error = errors[field.name];

    return (
      <div key={field.name} className={`admin-form__field${error ? " admin-form__field--error" : ""}`}>
        <label className="admin-form__label">
          {field.label}
          {field.required && <span className="admin-form__required">*</span>}
        </label>

        {field.type === "textarea" ? (
          <textarea
            className="admin-form__textarea"
            value={value ?? ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows ?? 3}
            disabled={field.disabled}
          />
        ) : field.type === "select" ? (
          <select
            className="admin-form__select"
            value={value ?? ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={field.disabled}
          >
            <option value="">Seçiniz...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === "switch" ? (
          <label className="admin-form__switch">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              disabled={field.disabled}
            />
            <span className="admin-form__switch-slider" />
          </label>
        ) : (
          <input
            className="admin-form__input"
            type={field.type}
            value={value ?? ""}
            onChange={(e) => handleChange(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
        )}

        {error && <span className="admin-form__error">{error}</span>}
      </div>
    );
  };

  return (
    <form className={`admin-form admin-form--${layout}`} onSubmit={handleSubmit}>
      <div className="admin-form__fields">
        {fields.map(renderField)}
      </div>
      <div className="admin-form__actions">
        <Button type="submit" disabled={!isDirty || isSubmitting} loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create admin-form.css**

```css
/* web/src/admin/styles/admin-form.css */

.admin-form {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 12px);
  padding: var(--space-6);
}

.admin-form__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.admin-form--two-column .admin-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-5);
}

.admin-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.admin-form__label {
  font-size: var(--text-sm, 14px);
  font-weight: var(--font-medium, 500);
  color: var(--text-primary);
}

.admin-form__required {
  color: var(--color-danger, #ef4444);
  margin-left: 2px;
}

.admin-form__input,
.admin-form__textarea,
.admin-form__select {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm, 14px);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm, 8px);
  background: var(--bg);
  color: var(--text-primary);
  transition: border-color var(--duration-fast, 150ms);
  font-family: inherit;
}

.admin-form__input:focus,
.admin-form__textarea:focus,
.admin-form__select:focus {
  outline: none;
  border-color: var(--accent, #6366f1);
  box-shadow: 0 0 0 3px var(--accent-ring, rgba(99, 102, 241, 0.1));
}

.admin-form__field--error .admin-form__input,
.admin-form__field--error .admin-form__textarea,
.admin-form__field--error .admin-form__select {
  border-color: var(--color-danger, #ef4444);
}

.admin-form__error {
  font-size: var(--text-xs, 12px);
  color: var(--color-danger, #ef4444);
}

/* ── Switch ── */
.admin-form__switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.admin-form__switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.admin-form__switch-slider {
  position: absolute;
  inset: 0;
  background: var(--surface-3);
  border-radius: 9999px;
  cursor: pointer;
  transition: background var(--duration-fast, 150ms);
}

.admin-form__switch-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform var(--duration-fast, 150ms);
}

.admin-form__switch input:checked + .admin-form__switch-slider {
  background: var(--accent, #6366f1);
}

.admin-form__switch input:checked + .admin-form__switch-slider::before {
  transform: translateX(20px);
}

/* ── Actions ── */
.admin-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

@media (max-width: 768px) {
  .admin-form--two-column .admin-form__fields {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add web/src/admin/components/FormBuilder.tsx web/src/admin/hooks/useForm.ts web/src/admin/styles/admin-form.css
git commit -m "feat(admin): add generic FormBuilder component with Zod validation"
```

---

## Phase 3: Routing & Module Pages

### Task 19: Admin Router, Guard & App Integration

**Files:**
- Create: `web/src/admin/AdminApp.tsx`
- Create: `web/src/admin/routes.tsx`
- Create: `web/src/admin/components/AdminGuard.tsx`
- Create: `web/src/admin/components/AdminNotFound.tsx`
- Modify: `web/src/App.tsx:23` (add admin route check)

- [ ] **Step 1: Create AdminGuard**

```tsx
// web/src/admin/components/AdminGuard.tsx
import type { ReactNode } from "react";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../../components/ui/Button";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" }}>
        <h2>Giriş Gerekli</h2>
        <p>Admin paneline erişmek için giriş yapmalısınız.</p>
        <Button onClick={() => { window.location.href = "/"; }}>Uygulamaya Dön</Button>
      </div>
    );
  }

  const role = (user as any).role;
  if (!role) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" }}>
        <h2>Yetkisiz Erişim</h2>
        <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        <Button onClick={() => { window.location.href = "/"; }}>Uygulamaya Dön</Button>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create AdminNotFound**

```tsx
// web/src/admin/components/AdminNotFound.tsx
import { Button } from "../../components/ui/Button";
import { useNavigate } from "react-router-dom";

export function AdminNotFound() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "16px" }}>
      <h2>404 — Sayfa Bulunamadı</h2>
      <p>Aradığınız admin sayfası mevcut değil.</p>
      <Button onClick={() => navigate("/admin")}>Dashboard'a Dön</Button>
    </div>
  );
}
```

- [ ] **Step 3: Create admin routes**

```tsx
// web/src/admin/routes.tsx
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { AdminGuard } from "./components/AdminGuard";
import { AdminNotFound } from "./components/AdminNotFound";
import { Spinner } from "../components/ui/Spinner";

// Lazy load all module pages
const DashboardPage = lazy(() => import("./modules/dashboard/DashboardPage"));
const UsersPage = lazy(() => import("./modules/users/UsersPage"));
const CoursesPage = lazy(() => import("./modules/courses/CoursesPage"));
const LessonsPage = lazy(() => import("./modules/lessons/LessonsPage"));
const ContentModerationPage = lazy(() => import("./modules/content-moderation/ContentModerationPage"));
const NotificationsPage = lazy(() => import("./modules/notifications/NotificationsPage"));
const AiStatsPage = lazy(() => import("./modules/ai-stats/AiStatsPage"));
const AuditLogPage = lazy(() => import("./modules/audit-log/AuditLogPage"));
const SettingsPage = lazy(() => import("./modules/settings/SettingsPage"));

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
      <Spinner size="lg" />
    </div>
  );
}

export function AdminRoutes() {
  return (
    <AdminGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
          <Route path="courses" element={<Suspense fallback={<PageLoader />}><CoursesPage /></Suspense>} />
          <Route path="lessons" element={<Suspense fallback={<PageLoader />}><LessonsPage /></Suspense>} />
          <Route path="content-moderation" element={<Suspense fallback={<PageLoader />}><ContentModerationPage /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
          <Route path="ai-stats" element={<Suspense fallback={<PageLoader />}><AiStatsPage /></Suspense>} />
          <Route path="audit-log" element={<Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </AdminGuard>
  );
}
```

- [ ] **Step 4: Create AdminApp entry**

```tsx
// web/src/admin/AdminApp.tsx
import { BrowserRouter } from "react-router-dom";
import { AdminRoutes } from "./routes";
import "./styles/admin-layout.css";
import "./styles/admin-sidebar.css";
import "./styles/admin-components.css";
import "./styles/admin-table.css";
import "./styles/admin-form.css";

export default function AdminApp() {
  return (
    <BrowserRouter>
      <AdminRoutes />
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Integrate into App.tsx**

Modify `web/src/App.tsx`. Add at the top of the file (after existing imports):

```typescript
const AdminApp = lazy(() => import("./admin/AdminApp"));
```

Then replace the `export default function App()` body. The entire function becomes:

```tsx
export default function App() {
  // Admin route — render separate admin app
  if (window.location.pathname.startsWith("/admin")) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }

  // Existing app code below (unchanged)
  const {
    lesson,
    // ... rest of useApp() destructuring stays the same
```

Only the early return is added before `const { ... } = useApp()`. The rest of the component stays exactly as-is.

- [ ] **Step 6: Verify compiles**

Run: `cd web && npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add web/src/admin/AdminApp.tsx web/src/admin/routes.tsx web/src/admin/components/AdminGuard.tsx web/src/admin/components/AdminNotFound.tsx web/src/App.tsx
git commit -m "feat(admin): integrate admin router into main app with lazy loading"
```

---

### Task 20: Dashboard Module

**Files:**
- Create: `web/src/admin/modules/dashboard/DashboardPage.tsx`
- Create: `web/src/admin/modules/dashboard/components/StatsGrid.tsx`
- Create: `web/src/admin/modules/dashboard/components/ActivityFeed.tsx`
- Create: `web/src/admin/modules/dashboard/hooks/useDashboardStats.ts`
- Create: `web/src/admin/modules/dashboard/services/dashboardApi.ts`
- Create: `web/src/admin/modules/dashboard/index.ts`

- [ ] **Step 1: Create dashboard API service**

```typescript
// web/src/admin/modules/dashboard/services/dashboardApi.ts
import { adminApi } from "../../../services/adminApi";
import type { AdminStats } from "../../../types";

export const dashboardApi = {
  getStats: () => adminApi.get<AdminStats>("/stats"),
};
```

- [ ] **Step 2: Create useDashboardStats hook**

```typescript
// web/src/admin/modules/dashboard/hooks/useDashboardStats.ts
import { useState, useEffect } from "react";
import { dashboardApi } from "../services/dashboardApi";
import type { AdminStats } from "../../../types";

export function useDashboardStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then((res) => setStats(res as any))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
```

- [ ] **Step 3: Create StatsGrid component**

```tsx
// web/src/admin/modules/dashboard/components/StatsGrid.tsx
import { Users, BookOpen, GraduationCap, FileText } from "lucide-react";
import { StatCard } from "../../../components/StatCard";
import type { AdminStats } from "../../../types";

export function StatsGrid({ stats }: { stats: AdminStats }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} icon={Users} color="#6366f1" />
      <StatCard label="Toplam Kurs" value={stats.totalCourses} icon={BookOpen} color="#22c55e" />
      <StatCard label="Toplam Ders" value={stats.totalLessons} icon={GraduationCap} color="#f59e0b" />
      <StatCard label="Quiz Paketleri" value={stats.totalQuizPacks} icon={FileText} color="#ec4899" />
    </div>
  );
}
```

- [ ] **Step 4: Create ActivityFeed component**

```tsx
// web/src/admin/modules/dashboard/components/ActivityFeed.tsx
import type { AuditEntry } from "../../../types";

export function ActivityFeed({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p style={{ color: "var(--text-secondary)", padding: "var(--space-4)" }}>Henüz aktivite yok.</p>;
  }

  return (
    <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md, 12px)" }}>
      <div style={{ padding: "var(--space-4)", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ margin: 0, fontSize: "var(--text-base, 16px)", fontWeight: 600 }}>Son Aktiviteler</h3>
      </div>
      <div>
        {entries.map((entry) => (
          <div key={entry.id} style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 500, fontSize: "var(--text-sm, 14px)" }}>{entry.action}</span>
              <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs, 12px)", marginLeft: "var(--space-2)" }}>{entry.resource}</span>
            </div>
            <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs, 12px)", flexShrink: 0 }}>
              {new Date(entry.timestamp).toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create DashboardPage**

```tsx
// web/src/admin/modules/dashboard/DashboardPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { StatsGrid } from "./components/StatsGrid";
import { ActivityFeed } from "./components/ActivityFeed";
import { useDashboardStats } from "./hooks/useDashboardStats";
import { Spinner } from "../../../components/ui/Spinner";

export default function DashboardPage() {
  const { stats, loading } = useDashboardStats();

  if (loading) {
    return (
      <PageContainer>
        <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Sistem durumuna genel bakış" />
      <PageContent>
        {stats && (
          <>
            <StatsGrid stats={stats} />
            <div style={{ marginTop: "var(--space-6)" }}>
              <ActivityFeed entries={stats.recentActivity ?? []} />
            </div>
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 6: Create index barrel**

```typescript
// web/src/admin/modules/dashboard/index.ts
export { default as DashboardPage } from "./DashboardPage";
```

- [ ] **Step 7: Commit**

```bash
git add web/src/admin/modules/dashboard/
git commit -m "feat(admin): add dashboard module with stats grid and activity feed"
```

---

### Task 21: Users Module

**Files:**
- Create: `web/src/admin/modules/users/UsersPage.tsx`
- Create: `web/src/admin/modules/users/services/userAdminApi.ts`
- Create: `web/src/admin/modules/users/hooks/useUsers.ts`
- Create: `web/src/admin/modules/users/components/RoleBadge.tsx`
- Create: `web/src/admin/modules/users/index.ts`

- [ ] **Step 1: Create user admin API**

```typescript
// web/src/admin/modules/users/services/userAdminApi.ts
import { adminApi } from "../../../services/adminApi";
import type { TableParams } from "../../../types";

export const userAdminApi = {
  list:    (params: TableParams) => adminApi.get<any[]>("/users", params),
  getById: (id: string) => adminApi.get<any>(`/users/${id}`),
  update:  (id: string, data: any) => adminApi.patch<any>(`/users/${id}`, data),
  setRole: (id: string, role: string) => adminApi.patch<any>(`/users/${id}/role`, { role }),
  delete:  (id: string) => adminApi.del(`/users/${id}`),
};
```

- [ ] **Step 2: Create RoleBadge component**

```tsx
// web/src/admin/modules/users/components/RoleBadge.tsx
const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  moderator: "#f59e0b",
  viewer: "#6366f1",
};

export function RoleBadge({ role }: { role: string }) {
  if (!role) return <span style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs, 12px)" }}>—</span>;

  const color = ROLE_COLORS[role] ?? "var(--text-secondary)";

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      fontSize: "var(--text-xs, 12px)",
      fontWeight: 600,
      borderRadius: "9999px",
      backgroundColor: `${color}20`,
      color,
      textTransform: "capitalize",
    }}>
      {role}
    </span>
  );
}
```

- [ ] **Step 3: Create UsersPage**

```tsx
// web/src/admin/modules/users/UsersPage.tsx
import { useState } from "react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import { RoleBadge } from "./components/RoleBadge";
import { userAdminApi } from "./services/userAdminApi";
import { PermissionGate } from "../../components/PermissionGate";
import { Button } from "../../../components/ui/Button";
import toast from "react-hot-toast";

export default function UsersPage() {
  const table = useTableState({ sortBy: "createdAt", sortDir: "desc" });
  const { data, total, isLoading, refetch } = useTableData<any>("/users", table.params);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      await userAdminApi.delete(id);
      toast.success("Kullanıcı silindi");
      refetch();
    } catch {}
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await userAdminApi.setRole(id, role);
      toast.success("Rol güncellendi");
      refetch();
    } catch {}
  };

  const columns: Column<any>[] = [
    { key: "email", label: "E-posta", sortable: true },
    { key: "profile.nickname", label: "İsim" },
    { key: "role", label: "Rol", render: (u) => <RoleBadge role={u.role} /> },
    { key: "status", label: "Durum", render: (u) => (
      <span style={{ color: u.status === "online" ? "var(--color-success, #22c55e)" : "var(--text-tertiary)" }}>
        {u.status || "offline"}
      </span>
    )},
    { key: "createdAt", label: "Kayıt Tarihi", sortable: true, render: (u) =>
      u.createdAt ? new Date(u.createdAt).toLocaleDateString("tr-TR") : "—"
    },
    { key: "actions", label: "", width: "120px", render: (u) => (
      <div style={{ display: "flex", gap: "4px" }}>
        <PermissionGate permission="roles:manage">
          <select
            value={u.role || ""}
            onChange={(e) => handleRoleChange(u._id || u.id, e.target.value)}
            style={{ fontSize: "12px", padding: "2px 4px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--text-primary)" }}
          >
            <option value="">Rol yok</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="viewer">Viewer</option>
          </select>
        </PermissionGate>
        <PermissionGate permission="users:delete">
          <button
            onClick={() => handleDelete(u._id || u.id)}
            style={{ fontSize: "12px", padding: "2px 8px", background: "transparent", border: "1px solid var(--color-danger, #ef4444)", color: "var(--color-danger, #ef4444)", borderRadius: "4px", cursor: "pointer" }}
          >
            Sil
          </button>
        </PermissionGate>
      </div>
    )},
  ];

  return (
    <PageContainer>
      <PageHeader title="Kullanıcılar" subtitle="Sistemdeki tüm kullanıcıları yönetin">
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Ara..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="admin-form__input"
            style={{ width: "200px" }}
          />
        </div>
      </PageHeader>
      <PageContent>
        <DataTable
          data={data}
          columns={columns}
          pagination={{ page: table.page, pageSize: table.limit, total, onPageChange: table.setPage }}
          sorting={{ sortBy: table.sortBy, sortDir: table.sortDir, onSort: table.setSort }}
          loading={isLoading}
          keyExtractor={(u) => u._id || u.id}
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 4: Create index**

```typescript
// web/src/admin/modules/users/index.ts
export { default as UsersPage } from "./UsersPage";
```

- [ ] **Step 5: Commit**

```bash
git add web/src/admin/modules/users/
git commit -m "feat(admin): add users module with table, role assignment, and delete"
```

---

### Task 22: Courses Module

**Files:**
- Create: `web/src/admin/modules/courses/CoursesPage.tsx`
- Create: `web/src/admin/modules/courses/index.ts`

- [ ] **Step 1: Create CoursesPage**

```tsx
// web/src/admin/modules/courses/CoursesPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import { PermissionGate } from "../../components/PermissionGate";
import { adminApi } from "../../services/adminApi";
import toast from "react-hot-toast";

export default function CoursesPage() {
  const table = useTableState({ sortBy: "createdAt", sortDir: "desc" });
  const { data, total, isLoading, refetch } = useTableData<any>("/courses", table.params);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kursu silmek istediğinize emin misiniz?")) return;
    try {
      await adminApi.del(`/courses/${id}`);
      toast.success("Kurs silindi");
      refetch();
    } catch {}
  };

  const columns: Column<any>[] = [
    { key: "code", label: "Kod", sortable: true },
    { key: "name", label: "Kurs Adı", sortable: true },
    { key: "lessonIds", label: "Ders Sayısı", render: (c) => c.lessonIds?.length ?? 0 },
    { key: "createdAt", label: "Oluşturulma", sortable: true, render: (c) =>
      c.createdAt ? new Date(c.createdAt).toLocaleDateString("tr-TR") : "—"
    },
    { key: "actions", label: "", width: "80px", render: (c) => (
      <PermissionGate permission="courses:delete">
        <button
          onClick={() => handleDelete(c.id)}
          style={{ fontSize: "12px", padding: "2px 8px", background: "transparent", border: "1px solid var(--color-danger, #ef4444)", color: "var(--color-danger, #ef4444)", borderRadius: "4px", cursor: "pointer" }}
        >
          Sil
        </button>
      </PermissionGate>
    )},
  ];

  return (
    <PageContainer>
      <PageHeader title="Kurslar" subtitle="Tüm kursları görüntüleyin ve yönetin">
        <input type="text" placeholder="Ara..." value={table.search} onChange={(e) => table.setSearch(e.target.value)} className="admin-form__input" style={{ width: "200px" }} />
      </PageHeader>
      <PageContent>
        <DataTable data={data} columns={columns} pagination={{ page: table.page, pageSize: table.limit, total, onPageChange: table.setPage }} sorting={{ sortBy: table.sortBy, sortDir: table.sortDir, onSort: table.setSort }} loading={isLoading} keyExtractor={(c) => c.id} />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/courses/index.ts
export { default as CoursesPage } from "./CoursesPage";
```

```bash
git add web/src/admin/modules/courses/
git commit -m "feat(admin): add courses module"
```

---

### Task 23: Lessons Module

**Files:**
- Create: `web/src/admin/modules/lessons/LessonsPage.tsx`
- Create: `web/src/admin/modules/lessons/index.ts`

- [ ] **Step 1: Create LessonsPage** (same pattern as CoursesPage)

```tsx
// web/src/admin/modules/lessons/LessonsPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import { PermissionGate } from "../../components/PermissionGate";
import { adminApi } from "../../services/adminApi";
import toast from "react-hot-toast";

export default function LessonsPage() {
  const table = useTableState({ sortBy: "createdAt", sortDir: "desc" });
  const { data, total, isLoading, refetch } = useTableData<any>("/lessons", table.params);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;
    try {
      await adminApi.del(`/lessons/${id}`);
      toast.success("Ders silindi");
      refetch();
    } catch {}
  };

  const columns: Column<any>[] = [
    { key: "title", label: "Başlık", sortable: true },
    { key: "courseCode", label: "Kurs" },
    { key: "plan", label: "Modül", render: (l) => l.plan?.modules?.length ?? 0 },
    { key: "createdAt", label: "Oluşturulma", sortable: true, render: (l) =>
      l.createdAt ? new Date(l.createdAt).toLocaleDateString("tr-TR") : "—"
    },
    { key: "actions", label: "", width: "80px", render: (l) => (
      <PermissionGate permission="lessons:delete">
        <button onClick={() => handleDelete(l.id)} style={{ fontSize: "12px", padding: "2px 8px", background: "transparent", border: "1px solid var(--color-danger, #ef4444)", color: "var(--color-danger, #ef4444)", borderRadius: "4px", cursor: "pointer" }}>
          Sil
        </button>
      </PermissionGate>
    )},
  ];

  return (
    <PageContainer>
      <PageHeader title="Dersler" subtitle="Tüm dersleri görüntüleyin ve yönetin">
        <input type="text" placeholder="Ara..." value={table.search} onChange={(e) => table.setSearch(e.target.value)} className="admin-form__input" style={{ width: "200px" }} />
      </PageHeader>
      <PageContent>
        <DataTable data={data} columns={columns} pagination={{ page: table.page, pageSize: table.limit, total, onPageChange: table.setPage }} sorting={{ sortBy: table.sortBy, sortDir: table.sortDir, onSort: table.setSort }} loading={isLoading} keyExtractor={(l) => l.id} />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/lessons/index.ts
export { default as LessonsPage } from "./LessonsPage";
```

```bash
git add web/src/admin/modules/lessons/
git commit -m "feat(admin): add lessons module"
```

---

### Task 24: Content Moderation Module

**Files:**
- Create: `web/src/admin/modules/content-moderation/ContentModerationPage.tsx`
- Create: `web/src/admin/modules/content-moderation/index.ts`

- [ ] **Step 1: Create ContentModerationPage**

```tsx
// web/src/admin/modules/content-moderation/ContentModerationPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { Shield } from "lucide-react";

export default function ContentModerationPage() {
  return (
    <PageContainer>
      <PageHeader title="İçerik Moderasyonu" subtitle="Paylaşılan içerikleri inceleyin ve onaylayın" />
      <PageContent>
        <EmptyState
          icon={<Shield size={48} />}
          message="Moderasyon bekleyen içerik yok"
          description="Kullanıcılar içerik paylaştığında burada görüntülenecektir."
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/content-moderation/index.ts
export { default as ContentModerationPage } from "./ContentModerationPage";
```

```bash
git add web/src/admin/modules/content-moderation/
git commit -m "feat(admin): add content moderation module (placeholder)"
```

---

### Task 25: Notifications Module

**Files:**
- Create: `web/src/admin/modules/notifications/NotificationsPage.tsx`
- Create: `web/src/admin/modules/notifications/index.ts`

- [ ] **Step 1: Create NotificationsPage**

```tsx
// web/src/admin/modules/notifications/NotificationsPage.tsx
import { useState } from "react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { FormBuilder, type FieldConfig } from "../../components/FormBuilder";
import { adminApi } from "../../services/adminApi";
import { z } from "zod";
import toast from "react-hot-toast";

const notificationSchema = z.object({
  title: z.string().min(1, "Başlık zorunlu"),
  message: z.string().min(1, "Mesaj zorunlu"),
  type: z.enum(["info", "warning", "success"]),
});

const fields: FieldConfig[] = [
  { name: "title", label: "Başlık", type: "text", required: true, placeholder: "Bildirim başlığı" },
  { name: "message", label: "Mesaj", type: "textarea", required: true, rows: 4, placeholder: "Bildirim içeriği" },
  { name: "type", label: "Tür", type: "select", options: [
    { value: "info", label: "Bilgi" },
    { value: "warning", label: "Uyarı" },
    { value: "success", label: "Başarı" },
  ]},
];

export default function NotificationsPage() {
  const handleSubmit = async (data: z.infer<typeof notificationSchema>) => {
    await adminApi.post("/notifications", data);
    toast.success("Bildirim gönderildi");
  };

  return (
    <PageContainer>
      <PageHeader title="Bildirimler" subtitle="Kullanıcılara toplu bildirim gönderin" />
      <PageContent>
        <FormBuilder
          schema={notificationSchema as any}
          defaultValues={{ title: "", message: "", type: "info" }}
          onSubmit={handleSubmit}
          fields={fields}
          submitLabel="Bildirim Gönder"
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/notifications/index.ts
export { default as NotificationsPage } from "./NotificationsPage";
```

```bash
git add web/src/admin/modules/notifications/
git commit -m "feat(admin): add notifications module with send form"
```

---

### Task 26: AI Stats Module

**Files:**
- Create: `web/src/admin/modules/ai-stats/AiStatsPage.tsx`
- Create: `web/src/admin/modules/ai-stats/index.ts`

- [ ] **Step 1: Create AiStatsPage**

```tsx
// web/src/admin/modules/ai-stats/AiStatsPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { BarChart3 } from "lucide-react";

export default function AiStatsPage() {
  return (
    <PageContainer>
      <PageHeader title="AI İstatistikleri" subtitle="AI kullanım istatistiklerini görüntüleyin" />
      <PageContent>
        <EmptyState
          icon={<BarChart3 size={48} />}
          message="AI istatistikleri yakında"
          description="AI API kullanım verileri burada görüntülenecektir."
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/ai-stats/index.ts
export { default as AiStatsPage } from "./AiStatsPage";
```

```bash
git add web/src/admin/modules/ai-stats/
git commit -m "feat(admin): add AI stats module (placeholder)"
```

---

### Task 27: Audit Log Module

**Files:**
- Create: `web/src/admin/modules/audit-log/AuditLogPage.tsx`
- Create: `web/src/admin/modules/audit-log/index.ts`

- [ ] **Step 1: Create AuditLogPage**

```tsx
// web/src/admin/modules/audit-log/AuditLogPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import type { AuditEntry } from "../../types";

export default function AuditLogPage() {
  const table = useTableState({ limit: 30 });
  const { data, total, isLoading } = useTableData<AuditEntry>("/audit-log", table.params);

  const columns: Column<AuditEntry>[] = [
    { key: "action", label: "Aksiyon", sortable: true },
    { key: "resource", label: "Kaynak" },
    { key: "userId", label: "Kullanıcı", render: (e) => e.userId.slice(0, 8) + "..." },
    { key: "ip", label: "IP" },
    { key: "timestamp", label: "Tarih", sortable: true, render: (e) =>
      new Date(e.timestamp).toLocaleString("tr-TR")
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Audit Log" subtitle="Tüm admin işlemlerinin kaydı" />
      <PageContent>
        <DataTable
          data={data}
          columns={columns}
          pagination={{ page: table.page, pageSize: table.limit, total, onPageChange: table.setPage }}
          sorting={{ sortBy: table.sortBy, sortDir: table.sortDir, onSort: table.setSort }}
          loading={isLoading}
          keyExtractor={(e) => e.id}
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/audit-log/index.ts
export { default as AuditLogPage } from "./AuditLogPage";
```

```bash
git add web/src/admin/modules/audit-log/
git commit -m "feat(admin): add audit log module"
```

---

### Task 28: Settings Module

**Files:**
- Create: `web/src/admin/modules/settings/SettingsPage.tsx`
- Create: `web/src/admin/modules/settings/index.ts`

- [ ] **Step 1: Create SettingsPage**

```tsx
// web/src/admin/modules/settings/SettingsPage.tsx
import { useState, useEffect } from "react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { FormBuilder, type FieldConfig } from "../../components/FormBuilder";
import { adminApi } from "../../services/adminApi";
import { Spinner } from "../../../components/ui/Spinner";
import { z } from "zod";
import toast from "react-hot-toast";
import type { SystemSettings } from "../../types";

const settingsSchema = z.object({
  rateLimitPerMinute: z.coerce.number().int().min(10).max(10000),
  maxUploadSizeMb: z.coerce.number().int().min(1).max(100),
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
});

const fields: FieldConfig[] = [
  { name: "rateLimitPerMinute", label: "Rate Limit (istek/dakika)", type: "number" },
  { name: "maxUploadSizeMb", label: "Maks. Yükleme Boyutu (MB)", type: "number" },
  { name: "maintenanceMode", label: "Bakım Modu", type: "switch" },
  { name: "allowRegistration", label: "Kayıt İzni", type: "switch" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get<SystemSettings>("/settings")
      .then((res) => setSettings(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: any) => {
    await adminApi.patch("/settings", data);
    toast.success("Ayarlar güncellendi");
  };

  if (loading) {
    return <PageContainer><div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size="lg" /></div></PageContainer>;
  }

  return (
    <PageContainer>
      <PageHeader title="Ayarlar" subtitle="Sistem ayarlarını yapılandırın" />
      <PageContent>
        <FormBuilder
          schema={settingsSchema as any}
          defaultValues={settings ?? {}}
          onSubmit={handleSubmit}
          fields={fields}
          submitLabel="Kaydet"
          layout="two-column"
        />
      </PageContent>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create index & commit**

```typescript
// web/src/admin/modules/settings/index.ts
export { default as SettingsPage } from "./SettingsPage";
```

```bash
git add web/src/admin/modules/settings/
git commit -m "feat(admin): add settings module with form"
```

---

## Phase 4: Verification

### Task 29: Full Build Verification

- [ ] **Step 1: Backend type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Frontend type check**

Run: `cd web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Frontend build**

Run: `cd web && npx vite build`
Expected: Build succeeds, admin chunks appear in output

- [ ] **Step 4: Fix any compilation errors found**

Address errors one by one based on compiler output.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete admin panel foundation with 9 modules"
```
