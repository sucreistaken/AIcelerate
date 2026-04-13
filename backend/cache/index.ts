/**
 * Central cache registry.
 * All data caches are initialized here and exported as singletons.
 *
 * MongoDB backing: each DataCache can optionally use a Mongoose model as the
 * source of truth. Call `initAllCaches()` after the database connection is
 * established to load data from MongoDB (replacing the initial JSON load).
 */

import path from "path";
import { DataCache } from "./dataCache";
import { ComputedCache } from "./computedCache";
import { logger } from "../utils/logger";
import type { Lesson } from "../types/lesson";
import type { Course, CourseKnowledgeIndex, CourseProgress } from "../types/course";
import type { Flashcard } from "../services/flashcardService";
import type { WeaknessAnalysis, WeaknessSummary } from "../services/weaknessService";
import type { ConceptConnection } from "../controllers/connectionsController";
import { LessonModel } from "../models/Lesson";
import { FlashcardModel } from "../models/Flashcard";
import { CourseModel } from "../models/Course";
import { WeaknessModel } from "../models/Weakness";

const DATA_DIR = path.join(process.cwd(), "backend", "data");

// ── Data Caches (replace sync file I/O) ──────────────────────────────

// Lesson cache: indexed by id (default) — no secondary index needed since
// lessons are always loaded in full and looked up by id
// MongoDB: Lesson model uses _id as String (same value as cache "id")
export const lessonCache = new DataCache<Lesson>({
  filePath: path.join(DATA_DIR, "lessons.json"),
  name: "lessons",
  flushDebounceMs: 500,
  mongoModel: LessonModel,
  mongoKeyField: "_id",
});

// Course cache
// MongoDB: Course model uses _id as String (same value as cache "id")
export const courseCache = new DataCache<Course>({
  filePath: path.join(DATA_DIR, "courses.json"),
  name: "courses",
  flushDebounceMs: 500,
  mongoModel: CourseModel,
  mongoKeyField: "_id",
});

// Flashcard cache with lessonId index for fast per-lesson queries
// MongoDB: Flashcard model uses _id as String (same value as cache "id")
export const flashcardCache = new DataCache<Flashcard>({
  filePath: path.join(DATA_DIR, "flashcards.json"),
  name: "flashcards",
  flushDebounceMs: 500,
  mongoModel: FlashcardModel,
  mongoKeyField: "_id",
}).addIndex("lessonId");

// Weakness analysis cache keyed by lessonId (not "id")
// MongoDB: Weakness model uses auto-generated _id; lookup by lessonId field
export const weaknessCache = new DataCache<WeaknessAnalysis>({
  filePath: path.join(DATA_DIR, "weakness.json"),
  name: "weakness",
  flushDebounceMs: 500,
  keyField: "lessonId",
  mongoModel: WeaknessModel,
  mongoKeyField: "lessonId",
});

// ── Computed Value Caches (TTL-based) ────────────────────────────────

/** Course progress: 60s TTL, invalidated on lesson/quiz/flashcard changes */
export const courseProgressCache = new ComputedCache<CourseProgress>(60_000);

/** Knowledge index: 120s TTL, invalidated on lesson changes */
export const knowledgeIndexCache = new ComputedCache<CourseKnowledgeIndex>(120_000);

/** Global weakness summary: 60s TTL */
export const weaknessSummaryCache = new ComputedCache<WeaknessSummary>(60_000);

/** Connections: 120s TTL */
export const connectionsCache = new ComputedCache<ConceptConnection[]>(120_000);

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

/**
 * Initialize all data caches from MongoDB.
 * Call AFTER connectDB() has established the database connection.
 * Each cache loads its data from MongoDB, replacing the initial JSON data.
 * If any individual cache fails to load from Mongo, it keeps its JSON data.
 */
export async function initAllCaches(): Promise<void> {
  const results = await Promise.allSettled([
    lessonCache.init(),
    courseCache.init(),
    flashcardCache.init(),
    weaknessCache.init(),
  ]);
  for (const r of results) {
    if (r.status === "rejected") {
      logger.error({ err: r.reason }, "Cache MongoDB init failed (using JSON fallback)");
    }
  }
}

/** Flush all data caches to disk (call on shutdown) */
export async function flushAllCaches(): Promise<void> {
  const results = await Promise.allSettled([
    lessonCache.flush(),
    courseCache.flush(),
    flashcardCache.flush(),
    weaknessCache.flush(),
  ]);
  for (const r of results) {
    if (r.status === "rejected") {
      logger.error({ err: r.reason }, "Cache flush failed");
    }
  }
}
