import mongoose, { Schema, Document } from "mongoose";

// ── Interfaces ────────────────────────────────────────────────────────────────

export type AppNotificationType =
  | "flashcard-due"
  | "weakness-alert"
  | "exam-countdown"
  | "schedule-reminder"
  | "streak-milestone";

export type AppNotificationSeverity = "info" | "warning" | "critical";

export interface IAppNotification extends Document {
  userId: string;
  type: AppNotificationType;
  title: string;
  message: string;
  severity: AppNotificationSeverity;
  dismissed: boolean;
  dismissedAt?: Date;
  actionTarget?: {
    mode: string;
    lessonId?: string;
    courseId?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const appNotificationSchema = new Schema<IAppNotification>(
  {
    userId: { type: String, required: true },
    type: {
      type: String,
      enum: ["flashcard-due", "weakness-alert", "exam-countdown", "schedule-reminder", "streak-milestone"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    dismissed: { type: Boolean, default: false },
    dismissedAt: Date,
    actionTarget: {
      mode: String,
      lessonId: String,
      courseId: String,
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// User's unread notifications, sorted newest first
appNotificationSchema.index({ userId: 1, dismissed: 1, createdAt: -1 });
// Deduplication: find recent notifications by type per user
appNotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
// TTL: auto-delete dismissed notifications after 30 days
appNotificationSchema.index(
  { dismissedAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { dismissed: true, dismissedAt: { $exists: true } } }
);

export const AppNotificationModel = mongoose.model<IAppNotification>("AppNotification", appNotificationSchema);
