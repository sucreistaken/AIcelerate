import { Router, Response } from "express";
import {
  listNotifications,
  dismissNotification,
  dismissAllNotifications,
  getUnreadCount,
  checkAndGenerateNotifications,
} from "../services/notificationService";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { emptyBodySchema } from "../validators/routeSchemas";

const router = Router();

router.get("/notifications", requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const unread = req.query.unread === "true";
  const notifications = await listNotifications(userId, unread);
  res.json({ ok: true, notifications });
}));

router.post("/notifications/:id/dismiss", requireAuth, validate(emptyBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const notif = await dismissNotification(userId, req.params.id);
  if (!notif) return res.status(404).json({ ok: false, error: "Notification not found" });
  res.json({ ok: true, notification: notif });
}));

router.post("/notifications/dismiss-all", requireAuth, validate(emptyBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const count = await dismissAllNotifications(userId);
  res.json({ ok: true, dismissed: count });
}));

router.get("/notifications/unread-count", requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const count = await getUnreadCount(userId);
  res.json({ ok: true, count });
}));

router.post("/notifications/check", requireAuth, validate(emptyBodySchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const newNotifications = await checkAndGenerateNotifications(userId);
  const count = await getUnreadCount(userId);

  const io = req.app.get("io");
  if (io) {
    for (const notif of newNotifications) {
      io.emit("notification:new", notif);
    }
    io.emit("notification:badge-update", { count });
  }

  res.json({ ok: true, newNotifications, count });
}));

export default router;
