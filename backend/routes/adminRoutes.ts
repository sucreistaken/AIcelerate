import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { auditLog } from "../middleware/auditLog";
import { validate } from "../middleware/validate";
import {
  paginationSchema,
  updateUserSchema,
  updateUserRoleSchema,
  createRoleSchema,
  updateRoleSchema,
  updateSettingsSchema,
  sendNotificationSchema,
  auditLogQuerySchema,
} from "../validators/adminSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";
import * as admin from "../controllers/adminController";

const router = Router();

router.use(requireAuth);

// ---- Stats ----
router.get(
  "/stats",
  requirePermission("stats:read"),
  asyncHandler(async (_req, res) => {
    const data = await admin.getStats();
    res.json({ ok: true, data });
  })
);

// ---- Users ----
router.get(
  "/users",
  requirePermission("users:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listUsers(params);
    res.json({ ok: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
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
  requirePermission("users:write"),
  validate(updateUserRoleSchema),
  auditLog("user.setRole"),
  asyncHandler(async (req, res) => {
    const user = await admin.setUserRole(req.params.id, req.body.role);
    res.json({ ok: true, data: user });
  })
);

router.delete(
  "/users/:id",
  requirePermission("users:delete"),
  validate(emptyBodySchema),
  auditLog("user.delete"),
  asyncHandler(async (req, res) => {
    const result = await admin.deleteUser(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Courses ----
router.get(
  "/courses",
  requirePermission("courses:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listCourses(params);
    res.json({ ok: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
  })
);

router.delete(
  "/courses/:id",
  requirePermission("courses:delete"),
  validate(emptyBodySchema),
  auditLog("course.delete"),
  asyncHandler(async (req, res) => {
    const result = await admin.deleteCourse(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Lessons ----
router.get(
  "/lessons",
  requirePermission("lessons:read"),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await admin.listLessons(params);
    res.json({ ok: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
  })
);

router.delete(
  "/lessons/:id",
  requirePermission("lessons:delete"),
  validate(emptyBodySchema),
  auditLog("lesson.delete"),
  asyncHandler(async (req, res) => {
    const result = await admin.deleteLesson(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Roles ----
router.get(
  "/roles",
  requirePermission("roles:read"),
  asyncHandler(async (_req, res) => {
    const roles = await admin.listRoles();
    res.json({ ok: true, data: roles });
  })
);

router.post(
  "/roles",
  requirePermission("roles:write"),
  validate(createRoleSchema),
  auditLog("role.create"),
  asyncHandler(async (req, res) => {
    const role = await admin.createRole(req.body);
    res.json({ ok: true, data: role });
  })
);

router.patch(
  "/roles/:id",
  requirePermission("roles:write"),
  validate(updateRoleSchema),
  auditLog("role.update"),
  asyncHandler(async (req, res) => {
    const role = await admin.updateRole(req.params.id, req.body);
    res.json({ ok: true, data: role });
  })
);

router.delete(
  "/roles/:id",
  requirePermission("roles:delete"),
  validate(emptyBodySchema),
  auditLog("role.delete"),
  asyncHandler(async (req, res) => {
    const result = await admin.deleteRole(req.params.id);
    res.json({ ok: true, ...result });
  })
);

// ---- Audit Log ----
router.get(
  "/audit-log",
  requirePermission("audit:read"),
  asyncHandler(async (req, res) => {
    const params = auditLogQuerySchema.parse(req.query);
    const result = await admin.getAuditLog(params);
    res.json({ ok: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
  })
);

// ---- Notifications ----
router.post(
  "/notifications",
  requirePermission("notifications:write"),
  validate(sendNotificationSchema),
  auditLog("notification.send"),
  asyncHandler(async (req, res) => {
    const notif = await admin.sendNotification(req.body);
    res.json({ ok: true, data: notif });
  })
);

// ---- Settings ----
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
