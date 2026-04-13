// controllers/notificationController.ts
import { notificationService } from "../services/notificationService";

// Re-export types so existing consumers don't break
export type {
  NotificationType,
  NotificationSeverity,
  StudyNotification,
} from "../services/notificationService";

// Re-export functions — all now require userId for data isolation
export async function listNotifications(userId: string, unreadOnly?: boolean) {
  return notificationService.listNotifications(userId, unreadOnly);
}

export async function dismissNotification(userId: string, notifId: string) {
  return notificationService.dismissNotification(userId, notifId);
}

export async function dismissAllNotifications(userId: string) {
  return notificationService.dismissAllNotifications(userId);
}

export async function getUnreadCount(userId: string) {
  return notificationService.getUnreadCount(userId);
}

export async function createNotification(userId: string, params: Parameters<typeof notificationService.createNotification>[1]) {
  return notificationService.createNotification(userId, params);
}

export async function checkAndGenerateNotifications(userId: string) {
  return notificationService.checkAndGenerateNotifications(userId);
}
