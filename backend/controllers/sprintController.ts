// controllers/sprintController.ts
// Thin wrapper — business logic lives in sprintService.

import { sprintService, SprintSettings, SprintSession } from "../services/sprintService";

export type { SprintSettings, SprintSession };

export function getSettings(): Promise<SprintSettings> {
  return sprintService.getSettings();
}

export function updateSettings(partial: Partial<SprintSettings>): Promise<SprintSettings> {
  return sprintService.updateSettings(partial);
}

export function createSession(lessonId?: string): Promise<SprintSession> {
  return sprintService.createSession(lessonId);
}

export function updateSession(
  sessionId: string,
  updates: Partial<SprintSession>
): Promise<SprintSession | null> {
  return sprintService.updateSession(sessionId, updates);
}

export function getSprintStats() {
  return sprintService.getStats();
}
