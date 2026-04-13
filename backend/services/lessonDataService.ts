// services/lessonDataService.ts
// Business logic extracted from lessonControllers.ts — CRUD, memory, progress.
import { lessonCache, invalidateLessonCaches } from "../cache";
import { generateId } from "../utils/idGenerator";
import { eventBus } from "../events/eventBus";
import { GlobalMemoryModel } from "../models/GlobalMemory";
import { logger } from "../utils/logger";
import type { Lesson, Emphasis } from "../types/lesson";

// Re-export types so consumers can import from one place
export type { Lesson, Emphasis, LoStudyModule, LessonLoModules, CheatSheet } from "../types/lesson";

// ---- Internal types ----
type GlobalMemory = {
  recurringConcepts: string[];
  recentEmphases: Array<Pick<Emphasis, "statement" | "why" | "confidence">>;
  lastUpdated: string;
};

// ---- Helpers (backed by DataCache — O(1) reads, debounced writes) ----
function loadLessons(): Lesson[] {
  return lessonCache.getAll();
}

const DEFAULT_USER_ID = "default";

async function loadMemory(userId?: string): Promise<GlobalMemory> {
  const uid = userId || DEFAULT_USER_ID;
  try {
    const doc = await GlobalMemoryModel.findOne({ userId: uid }).lean();
    if (doc) {
      return {
        recurringConcepts: doc.recurringConcepts || [],
        recentEmphases: (doc.recentEmphases || []).map((e: { statement?: string; why?: string; confidence?: number }) => ({
          statement: e.statement ?? "",
          why: e.why ?? "",
          confidence: e.confidence,
        })),
        lastUpdated: doc.lastUpdated || new Date().toISOString(),
      };
    }
  } catch (err) {
    logger.warn("Failed to load global memory from MongoDB, using defaults", err);
  }
  return {
    recurringConcepts: [],
    recentEmphases: [],
    lastUpdated: new Date().toISOString(),
  };
}

async function saveMemory(userId: string | undefined, mem: GlobalMemory): Promise<void> {
  const uid = userId || DEFAULT_USER_ID;
  mem.lastUpdated = new Date().toISOString();
  try {
    await GlobalMemoryModel.findOneAndUpdate(
      { userId: uid },
      {
        $set: {
          recurringConcepts: mem.recurringConcepts,
          recentEmphases: mem.recentEmphases,
          lastUpdated: mem.lastUpdated,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    logger.error("Failed to save global memory to MongoDB", err);
  }
}

async function updateGlobalMemoryFromLesson(stamped: Lesson): Promise<void> {
  const memory = await loadMemory(stamped.userId);

  (stamped.highlights || []).forEach((h) => {
    if (h && !memory.recurringConcepts.includes(h)) memory.recurringConcepts.push(h);
  });

  if (stamped.professorEmphases?.length) {
    for (const e of stamped.professorEmphases) {
      memory.recentEmphases.unshift({
        statement: e.statement,
        why: e.why,
        confidence: e.confidence,
      });
    }
    memory.recentEmphases = memory.recentEmphases.slice(0, 20);
  }

  await saveMemory(stamped.userId, memory);
}

// ---- Read Functions ----
export function listLessons(): Lesson[] {
  return loadLessons();
}

/** List lessons filtered by owner. Unowned lessons are visible to all. */
export function listLessonsForUser(userId: string): Lesson[] {
  return loadLessons().filter((l) => !l.userId || l.userId === userId);
}

export function listLessonsPaginatedForUser(
  userId: string,
  cursor?: string,
  limit = 20
): { items: Lesson[]; nextCursor: string | null; hasMore: boolean } {
  const all = loadLessons().filter((l) => !l.userId || l.userId === userId);
  let startIdx = 0;
  if (cursor) {
    const idx = all.findIndex((l) => l.id === cursor);
    if (idx >= 0) startIdx = idx + 1;
  }
  const sliced = all.slice(startIdx, startIdx + limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? last.id : null, hasMore };
}

export function listLessonsPaginated(cursor?: string, limit = 20): { items: Lesson[]; nextCursor: string | null; hasMore: boolean } {
  const all = loadLessons();
  let startIdx = 0;
  if (cursor) {
    const idx = all.findIndex((l) => l.id === cursor);
    if (idx >= 0) startIdx = idx + 1;
  }
  const sliced = all.slice(startIdx, startIdx + limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? last.id : null, hasMore };
}

export const getLessons = (): Lesson[] => listLessons();

export function getLesson(id: string): Lesson | null {
  return lessonCache.get(id);
}

export const getMemory = (userId?: string): Promise<GlobalMemory> => loadMemory(userId);

// ---- Write/Update Functions ----

export const addLesson = async (lesson: Lesson): Promise<Lesson> => {
  const stamped: Lesson = {
    ...lesson,
    createdAt: lesson.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lessonCache.set(stamped);

  await updateGlobalMemoryFromLesson(stamped);
  return stamped;
};

export async function upsertLesson(newL: Partial<Lesson> & { id?: string }): Promise<Lesson> {
  let l: Lesson;

  if (newL.id) {
    const existing = lessonCache.get(newL.id);
    if (existing) {
      l = {
        ...existing,
        ...newL,
        updatedAt: new Date().toISOString(),
      } as Lesson;

      l.transcript = l.transcript ?? "";
      l.slideText = l.slideText ?? "";
      l.highlights = l.highlights ?? [];
      l.professorEmphases = l.professorEmphases ?? [];
      l.quizPacks = l.quizPacks ?? existing.quizPacks ?? [];
      l.progress = { ...(existing.progress || {}), ...(newL.progress || {}) };
    } else {
      l = {
        id: newL.id,
        title: newL.title || "Untitled Lecture",
        date: newL.date || new Date().toISOString(),
        transcript: newL.transcript || "",
        slideText: newL.slideText || "",
        plan: newL.plan,
        summary: newL.summary,
        highlights: newL.highlights || [],
        professorEmphases: newL.professorEmphases || [],
        quiz: newL.quiz || [],
        quizPacks: newL.quizPacks || [],
        progress: newL.progress || { lastMode: "alignment", percent: 0 },
        createdAt: newL.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    const id = generateId("lec");
    l = {
      id,
      title: newL.title || "Untitled Lecture",
      date: newL.date || new Date().toISOString(),
      transcript: newL.transcript || "",
      slideText: newL.slideText || "",
      plan: newL.plan,
      summary: newL.summary,
      highlights: newL.highlights || [],
      professorEmphases: newL.professorEmphases || [],
      quiz: newL.quiz || [],
      quizPacks: newL.quizPacks || [],
      progress: newL.progress || { lastMode: "alignment", percent: 0 },
      createdAt: newL.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  lessonCache.set(l);
  eventBus.emit("lesson:updated", { lessonId: l.id });
  invalidateLessonCaches(l.id);
  await updateGlobalMemoryFromLesson(l);
  return l;
}

export function attachQuizPack(lessonId: string, packId: string) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return;

  const lp = lesson.quizPacks || [];
  lp.push({ packId, createdAt: new Date().toISOString() });
  lessonCache.set({ ...lesson, quizPacks: lp, updatedAt: new Date().toISOString() });
  invalidateLessonCaches(lessonId);
}

export function setQuizScore(lessonId: string, packId: string, score: number) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return;

  const lp = lesson.quizPacks || [];
  const p = lp.find((x) => x.packId === packId);
  if (p) p.lastScore = score;

  lessonCache.set({ ...lesson, quizPacks: lp, updatedAt: new Date().toISOString() });
  invalidateLessonCaches(lessonId);
}

export function updateProgress(
  lessonId: string,
  progress: Partial<NonNullable<Lesson["progress"]>>
) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return null;

  const updated = {
    ...lesson,
    progress: { ...(lesson.progress || {}), ...progress },
    updatedAt: new Date().toISOString(),
  };
  lessonCache.set(updated);
  invalidateLessonCaches(lessonId);
  return updated;
}

export function deleteLesson(lessonId: string): boolean {
  const deleted = lessonCache.delete(lessonId);
  if (deleted) invalidateLessonCaches(lessonId);
  return deleted;
}
