/**
 * Central cache registry.
 * All data caches are initialized here and exported as singletons.
 */

import path from "path";
import { DataCache } from "./dataCache";
import { ComputedCache } from "./computedCache";

const DATA_DIR = path.join(process.cwd(), "backend", "data");

// ── Data Caches (replace sync file I/O) ──────────────────────────────

// Lesson cache: indexed by id (default) — no secondary index needed since
// lessons are always loaded in full and looked up by id
export const lessonCache = new DataCache<any>({
  filePath: path.join(DATA_DIR, "lessons.json"),
  name: "lessons",
  flushDebounceMs: 500,
});

// Course cache
export const courseCache = new DataCache<any>({
  filePath: path.join(DATA_DIR, "courses.json"),
  name: "courses",
  flushDebounceMs: 500,
});

// Flashcard cache with lessonId index for fast per-lesson queries
export const flashcardCache = new DataCache<any>({
  filePath: path.join(DATA_DIR, "flashcards.json"),
  name: "flashcards",
  flushDebounceMs: 500,
}).addIndex("lessonId");

// Weakness analysis cache keyed by lessonId (not "id")
export const weaknessCache = new DataCache<any>({
  filePath: path.join(DATA_DIR, "weakness.json"),
  name: "weakness",
  flushDebounceMs: 500,
  keyField: "lessonId",
});

// ── Computed Value Caches (TTL-based) ────────────────────────────────

/** Course progress: 60s TTL, invalidated on lesson/quiz/flashcard changes */
export const courseProgressCache = new ComputedCache<any>(60_000);

/** Knowledge index: 120s TTL, invalidated on lesson changes */
export const knowledgeIndexCache = new ComputedCache<any>(120_000);

/** Global weakness summary: 60s TTL */
export const weaknessSummaryCache = new ComputedCache<any>(60_000);

/** Connections: 120s TTL */
export const connectionsCache = new ComputedCache<any>(120_000);

// ── Cache Invalidation Helpers ───────────────────────────────────────

/** Call when a lesson is modified (upsert, delete, quiz score change, etc.) */
export function invalidateLessonCaches(lessonId: string): void {
  // Find which course this lesson belongs to
  const courses = courseCache.getAll();
  for (const course of courses) {
    if (course.lessonIds?.includes(lessonId)) {
      courseProgressCache.invalidate(course.id);
      knowledgeIndexCache.invalidate(course.id);
    }
  }
  weaknessSummaryCache.clear();
  connectionsCache.clear();
}

/** Call when flashcard data changes */
export function invalidateFlashcardCaches(): void {
  courseProgressCache.clear();
}

/** Flush all data caches to disk (call on shutdown) */
export async function flushAllCaches(): Promise<void> {
  await Promise.all([
    lessonCache.flush(),
    courseCache.flush(),
    flashcardCache.flush(),
    weaknessCache.flush(),
  ]);
}
