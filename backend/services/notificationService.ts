import { AppNotificationModel } from "../models/AppNotification";
import { flashcardService } from "./flashcardService";
import { weaknessService } from "./weaknessService";
import { listCourses } from "./courseDataService";
import { schedulerPersistence } from "./schedulerService";

// ---- Types ----

export type NotificationType =
  | "flashcard-due"
  | "weakness-alert"
  | "exam-countdown"
  | "schedule-reminder"
  | "streak-milestone";

export type NotificationSeverity = "info" | "warning" | "critical";

export type StudyNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  dismissed: boolean;
  createdAt: string;
  dismissedAt?: string;
  actionTarget?: {
    mode: string;
    lessonId?: string;
    courseId?: string;
  };
  metadata?: Record<string, unknown>;
};

// ---- Helper: convert Mongo doc to StudyNotification shape ----

interface NotificationDoc {
  _id: { toString(): string } | string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  dismissed: boolean;
  createdAt: Date | string;
  dismissedAt?: Date | string;
  actionTarget?: StudyNotification["actionTarget"];
  metadata?: Record<string, unknown>;
}

function toStudyNotification(doc: NotificationDoc): StudyNotification {
  return {
    id: typeof doc._id === "string" ? doc._id : doc._id.toString(),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    severity: doc.severity,
    dismissed: doc.dismissed,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    dismissedAt: doc.dismissedAt
      ? doc.dismissedAt instanceof Date
        ? doc.dismissedAt.toISOString()
        : doc.dismissedAt
      : undefined,
    actionTarget: doc.actionTarget,
    metadata: doc.metadata,
  };
}

export const notificationService = {
  async listNotifications(userId: string, unreadOnly?: boolean): Promise<StudyNotification[]> {
    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) {
      filter.dismissed = false;
    }

    const docs = await AppNotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return docs.map(toStudyNotification);
  },

  async dismissNotification(userId: string, notifId: string): Promise<StudyNotification | null> {
    const doc = await AppNotificationModel.findOneAndUpdate(
      { _id: notifId, userId },
      { $set: { dismissed: true, dismissedAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    return doc ? toStudyNotification(doc) : null;
  },

  async dismissAllNotifications(userId: string): Promise<number> {
    const result = await AppNotificationModel.updateMany(
      { userId, dismissed: false },
      { $set: { dismissed: true, dismissedAt: new Date() } }
    );
    return result.modifiedCount;
  },

  async getUnreadCount(userId: string): Promise<number> {
    return AppNotificationModel.countDocuments({ userId, dismissed: false });
  },

  async createNotification(userId: string, params: {
    type: NotificationType;
    title: string;
    message: string;
    severity: NotificationSeverity;
    actionTarget?: StudyNotification["actionTarget"];
    metadata?: Record<string, unknown>;
  }): Promise<StudyNotification> {
    const doc = await AppNotificationModel.create({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      dismissed: false,
      actionTarget: params.actionTarget,
      metadata: params.metadata,
    });

    return toStudyNotification(doc.toObject());
  },

  async checkAndGenerateNotifications(userId: string): Promise<StudyNotification[]> {
    const newNotifications: StudyNotification[] = [];

    // ---- Batch dedup: single query to get all recent notification types + milestoneKeys ----
    // Longest cooldown is ~365d (milestone-based), so query everything from last year.
    const longCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const recentDocs = await AppNotificationModel.find(
      { userId, createdAt: { $gte: longCutoff } },
      { type: 1, createdAt: 1, "metadata.milestoneKey": 1 }
    ).lean();

    // Build lookup sets for fast in-memory dedup
    const recentByType = new Map<string, Date>();
    const milestoneKeys = new Set<string>();
    for (const doc of recentDocs) {
      const existing = recentByType.get(doc.type);
      const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
      if (!existing || createdAt > existing) {
        recentByType.set(doc.type, createdAt);
      }
      const mk = (doc.metadata as Record<string, unknown> | undefined)?.milestoneKey;
      if (typeof mk === "string") milestoneKeys.add(mk);
    }

    function hasRecent(type: NotificationType, cooldownHours: number, milestoneKey?: string): boolean {
      if (milestoneKey) return milestoneKeys.has(milestoneKey);
      const latest = recentByType.get(type);
      if (!latest) return false;
      return (Date.now() - latest.getTime()) < cooldownHours * 60 * 60 * 1000;
    }

    // Collect all candidate notifications, then batch-insert at the end
    type NotifCandidate = { type: NotificationType; title: string; message: string; severity: NotificationSeverity; actionTarget?: StudyNotification["actionTarget"]; metadata?: Record<string, unknown> };
    const candidates: NotifCandidate[] = [];

    // ---- Rule 1: Flashcard due ----
    const dueCards = flashcardService.getDueCards();
    if (dueCards.length > 0 && !hasRecent("flashcard-due", 12)) {
      candidates.push({
        type: "flashcard-due",
        title: "Flashcards Due",
        message: `You have ${dueCards.length} flashcard${dueCards.length > 1 ? "s" : ""} waiting for review.`,
        severity: dueCards.length > 10 ? "warning" : "info",
        actionTarget: { mode: "flashcards" },
        metadata: { count: dueCards.length },
      });
    }

    // ---- Rule 2: Weakness alert ----
    const weaknessSummary = weaknessService.getGlobalWeaknessSummary();
    const decliningTopics = weaknessSummary.globalWeakTopics.filter((t) => t.averageRatio < 0.5);

    if (decliningTopics.length > 0 && !hasRecent("weakness-alert", 24)) {
      const worstTopic = decliningTopics[0];
      candidates.push({
        type: "weakness-alert",
        title: "Weak Topics Detected",
        message: `"${worstTopic.topicName}" is at ${Math.round(worstTopic.averageRatio * 100)}%. ${decliningTopics.length > 1 ? `${decliningTopics.length - 1} more weak topic${decliningTopics.length > 2 ? "s" : ""}.` : ""}`,
        severity: worstTopic.averageRatio < 0.3 ? "critical" : "warning",
        actionTarget: { mode: "weakness" },
        metadata: { topicCount: decliningTopics.length, worstRatio: worstTopic.averageRatio },
      });
    }

    // ---- Rule 3: Exam countdown ----
    const courses = listCourses();
    const examMilestones = [30, 14, 7, 3, 1];

    for (const course of courses) {
      if (!course.settings?.examDate) continue;
      const diffMs = new Date(course.settings.examDate).getTime() - Date.now();
      if (diffMs < 0) continue;
      const daysToExam = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      for (const milestone of examMilestones) {
        if (daysToExam <= milestone && daysToExam > (milestone === 1 ? 0 : milestone - 1)) {
          const milestoneKey = `exam-${course.id}-${milestone}d`;
          if (!hasRecent("exam-countdown", 24 * 365, milestoneKey)) {
            let severity: NotificationSeverity = "info";
            if (milestone <= 1) severity = "critical";
            else if (milestone <= 3) severity = "warning";
            candidates.push({
              type: "exam-countdown",
              title: `Exam in ${daysToExam} day${daysToExam > 1 ? "s" : ""}`,
              message: `${course.code} - ${course.name} exam is ${daysToExam === 1 ? "tomorrow" : `in ${daysToExam} days`}!`,
              severity,
              actionTarget: { mode: "course-dashboard", courseId: course.id },
              metadata: { milestoneKey, daysToExam, courseId: course.id },
            });
          }
        }
      }
    }

    // ---- Rule 4: Streak milestones ----
    const streak = await schedulerPersistence.getStreak();
    const streakMilestones = [3, 7, 14, 30];

    for (const ms of streakMilestones) {
      if (streak.currentStreak === ms) {
        const milestoneKey = `streak-${ms}`;
        if (!hasRecent("streak-milestone", 24 * 365, milestoneKey)) {
          candidates.push({
            type: "streak-milestone",
            title: `${ms}-Day Streak!`,
            message: `You've studied ${ms} days in a row. Keep it up!`,
            severity: "info",
            metadata: { milestoneKey, streakDays: ms },
          });
        }
      }
    }

    // ---- Batch insert all notifications at once (single DB round trip) ----
    if (candidates.length > 0) {
      const docs = await AppNotificationModel.insertMany(
        candidates.map((c) => ({ userId, ...c, dismissed: false }))
      );
      for (const doc of docs) {
        newNotifications.push(toStudyNotification(doc.toObject()));
      }
    }

    return newNotifications;
  },
};

// ── Standalone function aliases for backward-compatible imports ──

export const listNotifications = (userId: string, unreadOnly?: boolean) =>
  notificationService.listNotifications(userId, unreadOnly);

export const dismissNotification = (userId: string, notifId: string) =>
  notificationService.dismissNotification(userId, notifId);

export const dismissAllNotifications = (userId: string) =>
  notificationService.dismissAllNotifications(userId);

export const getUnreadCount = (userId: string) =>
  notificationService.getUnreadCount(userId);

export const createNotification = (userId: string, params: Parameters<typeof notificationService.createNotification>[1]) =>
  notificationService.createNotification(userId, params);

export const checkAndGenerateNotifications = (userId: string) =>
  notificationService.checkAndGenerateNotifications(userId);
