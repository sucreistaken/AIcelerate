// services/sprintService.ts
// Business logic for sprint settings and study sessions (MongoDB-backed).

import { SprintModel, ISprintSettings, ISprintSession } from "../models/Sprint";
import { generateId } from "../utils/idGenerator";

const GLOBAL_USER = "global";
const rid = () => generateId("sprint");

const DEFAULT_SETTINGS: ISprintSettings = {
  studyDurationMin: 40,
  breakDurationMin: 10,
  intensiveMode: false,
};

export type SprintSettings = ISprintSettings;
export type SprintSession = ISprintSession;

export const sprintService = {
  /**
   * Ensure a sprint document exists for the global user.
   */
  async ensureDoc() {
    return SprintModel.findOneAndUpdate(
      { userId: GLOBAL_USER },
      { $setOnInsert: { settings: DEFAULT_SETTINGS, sessions: [] } },
      { upsert: true, returnDocument: 'after' }
    );
  },

  async getSettings(): Promise<ISprintSettings> {
    const doc = await this.ensureDoc();
    return doc.settings;
  },

  async updateSettings(partial: Partial<ISprintSettings>): Promise<ISprintSettings> {
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (value !== undefined) {
        setFields[`settings.${key}`] = value;
      }
    }

    const doc = await SprintModel.findOneAndUpdate(
      { userId: GLOBAL_USER },
      { $set: setFields },
      { returnDocument: 'after', upsert: true }
    );
    return doc!.settings;
  },

  async createSession(lessonId?: string): Promise<ISprintSession> {
    const session: ISprintSession = {
      id: rid(),
      startedAt: new Date().toISOString(),
      lessonId,
      status: "studying",
      pomodorosCompleted: 0,
      topicsCovered: [],
      totalStudyMinutes: 0,
    };

    // Push new session to front, keep max 50
    await SprintModel.findOneAndUpdate(
      { userId: GLOBAL_USER },
      {
        $push: { sessions: { $each: [session], $position: 0, $slice: 50 } },
        $setOnInsert: { settings: DEFAULT_SETTINGS },
      },
      { upsert: true }
    );

    return session;
  },

  async updateSession(
    sessionId: string,
    updates: Partial<ISprintSession>
  ): Promise<ISprintSession | null> {
    // Build $set fields for the matched array element
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== "id") {
        setFields[`sessions.$.${key}`] = value;
      }
    }

    const doc = await SprintModel.findOneAndUpdate(
      { userId: GLOBAL_USER, "sessions.id": sessionId },
      { $set: setFields },
      { returnDocument: 'after' }
    );

    if (!doc) return null;
    return doc.sessions.find((s) => s.id === sessionId) || null;
  },

  async getStats(): Promise<{
    totalSessions: number;
    totalStudyMinutes: number;
    totalPomodoros: number;
    topicsCovered: string[];
    recentSessions: ISprintSession[];
  }> {
    const doc = await this.ensureDoc();
    const sessions = doc.sessions;

    return {
      totalSessions: sessions.length,
      totalStudyMinutes: sessions.reduce((a, s) => a + s.totalStudyMinutes, 0),
      totalPomodoros: sessions.reduce((a, s) => a + s.pomodorosCompleted, 0),
      topicsCovered: [...new Set(sessions.flatMap((s) => s.topicsCovered))],
      recentSessions: sessions.slice(0, 10),
    };
  },
};
