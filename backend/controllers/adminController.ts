// controllers/adminController.ts
import { User } from "../models/User";
import { roleRepo } from "../repositories/roleRepo";
import { auditRepo } from "../repositories/auditRepo";
import { settingsRepo } from "../repositories/settingsRepo";
import { generateId } from "../utils/idGenerator";
import { notFound, badRequest, forbidden, conflict } from "../middleware/errorHandler";
import type { PaginationParams, PaginatedResponse, Permission } from "../types/admin";

// ---- Dynamic imports for repos that may not exist in all setups ----

async function getCourseRepo() {
  const mod = await import("../repositories/courseRepo");
  return mod.courseRepo;
}

async function getLessonRepo() {
  const mod = await import("../repositories/lessonRepo");
  return mod.lessonRepo;
}

// ---- Stats ----

export async function getStats() {
  let totalUsers = 0;
  try {
    totalUsers = await User.countDocuments();
  } catch {
    // MongoDB unavailable
  }

  let totalCourses = 0;
  try {
    const repo = await getCourseRepo();
    totalCourses = await repo.count();
  } catch {
    // courseRepo unavailable
  }

  let totalLessons = 0;
  try {
    const repo = await getLessonRepo();
    totalLessons = await repo.count();
  } catch {
    // lessonRepo unavailable
  }

  const auditResult = await auditRepo.findPaginated({
    page: 1,
    limit: 10,
    sortDir: "desc",
  });

  return {
    totalUsers,
    totalCourses,
    totalLessons,
    recentAuditEntries: auditResult.items,
  };
}

// ---- Users ----

export async function listUsers(params: PaginationParams) {
  const { page = 1, limit = 20, sortBy = "createdAt", sortDir = "desc", search } = params;

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { "profile.nickname": { $regex: search, $options: "i" } },
    ];
  }

  const total = await User.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const sortObj: Record<string, 1 | -1> = { [sortBy]: sortDir === "asc" ? 1 : -1 };

  const users = await User.find(filter)
    .select("-passwordHash")
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  return { items: users, total, page, limit, totalPages };
}

export async function getUser(id: string) {
  const user = await User.findById(id).select("-passwordHash");
  if (!user) throw notFound("User not found");
  return user;
}

export async function updateUser(id: string, updates: Record<string, unknown>) {
  // Don't allow passwordHash updates via admin
  delete updates.passwordHash;
  delete updates.password;

  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select(
    "-passwordHash"
  );
  if (!user) throw notFound("User not found");
  return user;
}

export async function setUserRole(id: string, role: string) {
  // Verify role exists
  const roleEntry = await roleRepo.findByName(role);
  if (!roleEntry) throw badRequest(`Role "${role}" does not exist`);

  const user = await User.findByIdAndUpdate(
    id,
    { role },
    { new: true }
  ).select("-passwordHash");
  if (!user) throw notFound("User not found");
  return user;
}

export async function deleteUser(id: string) {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw notFound("User not found");
  return { deleted: true };
}

// ---- Courses ----

export async function listCourses(params: PaginationParams) {
  const { page = 1, limit = 20, sortBy = "createdAt", sortDir = "desc", search } = params;

  const repo = await getCourseRepo();
  let items = await repo.findAll();

  // Search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (c: any) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.code || "").toLowerCase().includes(q)
    );
  }

  // Sort
  items.sort((a: any, b: any) => {
    const aVal = a[sortBy] ?? "";
    const bVal = b[sortBy] ?? "";
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return { items: paged, total, page, limit, totalPages };
}

export async function deleteCourse(id: string) {
  const repo = await getCourseRepo();
  const deleted = await repo.delete(id);
  if (!deleted) throw notFound("Course not found");
  return { deleted: true };
}

// ---- Lessons ----

export async function listLessons(params: PaginationParams) {
  const { page = 1, limit = 20, sortBy = "createdAt", sortDir = "desc", search } = params;

  const repo = await getLessonRepo();
  let items = await repo.findAll();

  // Search
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (l: any) =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.id || "").toLowerCase().includes(q)
    );
  }

  // Sort
  items.sort((a: any, b: any) => {
    const aVal = a[sortBy] ?? "";
    const bVal = b[sortBy] ?? "";
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return { items: paged, total, page, limit, totalPages };
}

export async function deleteLesson(id: string) {
  const repo = await getLessonRepo();
  const deleted = await repo.delete(id);
  if (!deleted) throw notFound("Lesson not found");
  return { deleted: true };
}

// ---- Roles ----

export async function listRoles() {
  return roleRepo.findAll();
}

export async function createRole(data: {
  name: string;
  description?: string;
  permissions?: Permission[];
}) {
  const existing = await roleRepo.findByName(data.name);
  if (existing) throw conflict(`Role "${data.name}" already exists`);

  const role = {
    id: generateId("role"),
    name: data.name,
    description: data.description || "",
    permissions: (data.permissions || []) as Permission[],
    isSystem: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return roleRepo.create(role);
}

export async function updateRole(
  id: string,
  updates: { name?: string; description?: string; permissions?: Permission[] }
) {
  const role = await roleRepo.findById(id);
  if (!role) throw notFound("Role not found");

  // System roles cannot be renamed
  if (role.isSystem && updates.name && updates.name !== role.name) {
    throw forbidden("System roles cannot be renamed");
  }

  return roleRepo.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRole(id: string) {
  const role = await roleRepo.findById(id);
  if (!role) throw notFound("Role not found");
  if (role.isSystem) throw forbidden("System roles cannot be deleted");

  const deleted = await roleRepo.delete(id);
  if (!deleted) throw notFound("Role not found");
  return { deleted: true };
}

// ---- Audit Log ----

export async function getAuditLog(params: {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  return auditRepo.findPaginated(params);
}

// ---- Settings ----

export async function getSettings() {
  return settingsRepo.getSettings();
}

export async function updateSettings(
  updates: Partial<{
    rateLimitPerMinute: number;
    maxUploadSizeMb: number;
    maintenanceMode: boolean;
    allowRegistration: boolean;
  }>
) {
  return settingsRepo.updateSettings(updates);
}

// ---- Notifications ----

export async function sendNotification(data: {
  title: string;
  message: string;
  severity?: string;
  type?: string;
  targetUserIds?: string[];
}) {
  try {
    // Dynamic import — graceful if notification controller is unavailable
    const { createNotification } = await import("./notificationController");

    const notif = createNotification({
      type: (data.type || "schedule-reminder") as any,
      title: data.title,
      message: data.message,
      severity: (data.severity || "info") as any,
    });

    return notif;
  } catch {
    throw badRequest(
      "Notification system is not available"
    );
  }
}
