// Notification types

import type { ModeId } from './lesson';

export type NotificationType =
  | "flashcard-due"
  | "weakness-alert"
  | "exam-countdown"
  | "schedule-reminder"
  | "streak-milestone";

export type NotificationSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  dismissed: boolean;
  createdAt: string;
  dismissedAt?: string;
  actionTarget?: {
    mode: ModeId;
    lessonId?: string;
    courseId?: string;
  };
  metadata?: Record<string, any>;
}
