// controllers/weaknessController.ts
// Thin wrapper — all business logic lives in services/weaknessService.ts.
// Re-exports types and functions so existing consumers don't break.

import { weaknessService } from "../services/weaknessService";

// ── Re-export types from the service ─────────────────────────────────────────
export type { TopicScore, WeaknessAnalysis, WeaknessSummary } from "../services/weaknessService";

// ── Delegate functions (preserve original signatures) ────────────────────────

export function analyzeLessonWeakness(lessonId: string) {
  return weaknessService.analyzeLessonWeakness(lessonId);
}

export function analyzeAllWeaknesses() {
  return weaknessService.analyzeAllWeaknesses();
}

export function getWeaknessForLesson(lessonId: string) {
  return weaknessService.getWeaknessForLesson(lessonId);
}

export function getGlobalWeaknessSummary() {
  return weaknessService.getGlobalWeaknessSummary();
}
