// services/courseDataService.ts
// All course business logic: CRUD, relationships, knowledge index, progress, export, migration.
import {
  courseCache, lessonCache, flashcardCache,
  courseProgressCache, knowledgeIndexCache,
} from "../cache";
import { generateId } from "../utils/idGenerator";
import { weaknessService } from "./weaknessService";
import { logger } from "../utils/logger";
import type { Lesson } from "../types/lesson";
import type { Course, CourseKnowledgeIndex } from "../types/course";
import type { PlanEmphasis } from "../types";

// Re-export types from canonical location
export type { Course, CourseKnowledgeIndex, FlashcardStats, LessonStatus, CourseProgress } from "../types/course";

// ---- Helpers (backed by DataCache) ----
function loadCourses(): Course[] {
  return courseCache.getAll();
}

// ---- CRUD ----
export function listCourses(): Course[] {
  return loadCourses();
}

export function getCourse(id: string): Course | null {
  return courseCache.get(id);
}

/** List courses filtered by owner. Unowned courses are visible to all. */
export function listCoursesForUser(userId: string): Course[] {
  return loadCourses().filter((c) => !c.userId || c.userId === userId);
}

/** Get course only if owned by userId (or unowned). Returns null if unauthorized. */
export function getCourseForUser(id: string, userId: string): Course | null {
  const course = courseCache.get(id);
  if (!course) return null;
  if (course.userId && course.userId !== userId) return null;
  return course;
}

export function createCourse(data: { code: string; name: string; description?: string; learningOutcomes?: string[]; settings?: Course["settings"] }): Course {
  const course: Course = {
    id: generateId("course"),
    code: data.code,
    name: data.name,
    description: data.description,
    lessonIds: [],
    learningOutcomes: data.learningOutcomes || [],
    settings: data.settings || { language: "en" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  courseCache.set(course);
  return course;
}

export function updateCourse(id: string, updates: Partial<Omit<Course, "id" | "createdAt">>): Course | null {
  const existing = courseCache.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  courseCache.set(updated);
  courseProgressCache.invalidate(id);
  knowledgeIndexCache.invalidate(id);
  return updated;
}

export function deleteCourse(id: string): boolean {
  const deleted = courseCache.delete(id);
  if (deleted) {
    courseProgressCache.invalidate(id);
    knowledgeIndexCache.invalidate(id);
  }
  return deleted;
}

// ---- Lesson-Course Relationships ----
export function addLessonToCourse(courseId: string, lessonId: string): Course | null {
  const course = courseCache.get(courseId);
  if (!course) return null;

  if (!course.lessonIds.includes(lessonId)) {
    const updated = { ...course, lessonIds: [...course.lessonIds, lessonId], updatedAt: new Date().toISOString() };
    courseCache.set(updated);
    courseProgressCache.invalidate(courseId);
    knowledgeIndexCache.invalidate(courseId);
    return updated;
  }
  return course;
}

export function removeLessonFromCourse(courseId: string, lessonId: string): Course | null {
  const course = courseCache.get(courseId);
  if (!course) return null;

  const updated = {
    ...course,
    lessonIds: course.lessonIds.filter((id: string) => id !== lessonId),
    updatedAt: new Date().toISOString(),
  };
  courseCache.set(updated);
  courseProgressCache.invalidate(courseId);
  knowledgeIndexCache.invalidate(courseId);
  return updated;
}

export function getCourseLessons(courseId: string): Lesson[] {
  const course = getCourse(courseId);
  if (!course) return [];
  return course.lessonIds
    .map((id: string) => lessonCache.get(id))
    .filter((l): l is Lesson => l !== null);
}

export function getCourseForLesson(lessonId: string): Course | null {
  return courseCache.find((c) => c.lessonIds?.includes(lessonId));
}

// ---- Orphan Lesson Migration ----
const GENERAL_COURSE_CODE = "GENEL";

export function migrateOrphanLessons(): void {
  const courses = courseCache.getAll();
  const lessons = lessonCache.getAll();

  const assignedIds = new Set<string>();
  for (const c of courses) {
    for (const lid of c.lessonIds) assignedIds.add(lid);
  }

  const orphanIds = lessons.filter((l) => !assignedIds.has(l.id)).map((l) => l.id);
  if (orphanIds.length === 0) return;

  let general = courseCache.find((c) => c.code === GENERAL_COURSE_CODE);
  if (!general) {
    general = {
      id: "course-general",
      code: GENERAL_COURSE_CODE,
      name: "Genel",
      description: "Kursa atanmamış dersler",
      lessonIds: [],
      learningOutcomes: [],
      settings: { language: "tr" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const newLessonIds = [...general.lessonIds];
  for (const oid of orphanIds) {
    if (!newLessonIds.includes(oid)) {
      newLessonIds.push(oid);
    }
  }
  courseCache.set({ ...general, lessonIds: newLessonIds, updatedAt: new Date().toISOString() });

  logger.info(`[Migration] ${orphanIds.length} orphan lesson(s) assigned to "${GENERAL_COURSE_CODE}" course.`);
}

// ---- Knowledge Index Builder ----
export function rebuildKnowledgeIndex(courseId: string): CourseKnowledgeIndex | null {
  const cached = knowledgeIndexCache.get(courseId);
  if (cached) return cached;

  const course = getCourse(courseId);
  if (!course) return null;

  const lessons = course.lessonIds
    .map((id: string) => lessonCache.get(id))
    .filter((l): l is Lesson => l !== null);

  const lessonDigests = lessons.map((lesson, i) => {
    const plan = lesson.plan || {};
    const emphases: PlanEmphasis[] = lesson.professorEmphases || plan.emphases || [];

    const coveredLOIds: string[] = [];
    if (lesson.loAlignment?.segments) {
      for (const seg of lesson.loAlignment.segments) {
        for (const link of seg.lo_links || []) {
          if (link.confidence >= 0.5 && !coveredLOIds.includes(link.lo_id)) {
            coveredLOIds.push(link.lo_id);
          }
        }
      }
    }

    return {
      lessonId: lesson.id,
      title: lesson.title || "Untitled",
      weekNumber: i + 1,
      keyTopics: (plan.key_concepts || []).slice(0, 5),
      emphasisHighlights: emphases.slice(0, 3).map((e: PlanEmphasis) => e.statement || String(e)),
      coveredLOIds,
    };
  });

  const topicProgression = lessonDigests.map((d) => d.title);

  const topicCounts = new Map<string, number>();
  for (const digest of lessonDigests) {
    for (const topic of digest.keyTopics) {
      const key = topic.toLowerCase().trim();
      topicCounts.set(key, (topicCounts.get(key) || 0) + 1);
    }
  }
  const courseThemes = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  const conceptLessonsMap = new Map<string, { weeks: Set<number>; lessonTitles: string[] }>();
  for (const digest of lessonDigests) {
    for (const topic of digest.keyTopics) {
      const key = topic.toLowerCase().trim();
      if (!conceptLessonsMap.has(key)) {
        conceptLessonsMap.set(key, { weeks: new Set(), lessonTitles: [] });
      }
      const entry = conceptLessonsMap.get(key)!;
      entry.weeks.add(digest.weekNumber);
      entry.lessonTitles.push(digest.title);
    }
  }

  const conceptBridges: CourseKnowledgeIndex["conceptBridges"] = [];
  for (const [concept, data] of conceptLessonsMap) {
    if (data.weeks.size < 2) continue;
    const weeks = [...data.weeks].sort((a, b) => a - b);
    const evolution = `Introduced in W${weeks[0]}, revisited in W${weeks.slice(1).join(", W")}`;
    conceptBridges.push({ concept, appearsInWeeks: weeks, evolution });
  }

  const courseLOs = course.learningOutcomes || [];
  const loCoverage: CourseKnowledgeIndex["loCoverage"] = courseLOs.map((lo, i) => {
    const loId = `LO${i + 1}`;
    const coveredBy = lessonDigests
      .filter((d) => d.coveredLOIds.includes(loId))
      .map((d) => d.lessonId);

    let coverageLevel: "full" | "partial" | "none" = "none";
    if (coveredBy.length >= 2) coverageLevel = "full";
    else if (coveredBy.length === 1) coverageLevel = "partial";

    return { loId, loTitle: lo, coveredByLessons: coveredBy, coverageLevel };
  });

  let totalScore = 0;
  let scoreCount = 0;
  for (const lesson of lessons) {
    const packs = lesson.quizPacks || [];
    for (const pack of packs) {
      if (typeof pack.lastScore === "number") {
        totalScore += pack.lastScore;
        scoreCount++;
      }
    }
  }

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];
  for (const lesson of lessons) {
    const weakness = weaknessService.getWeaknessForLesson(lesson.id);
    if (weakness?.topics) {
      for (const topic of weakness.topics) {
        if (topic.isWeak) {
          if (!weakTopics.includes(topic.topicName)) weakTopics.push(topic.topicName);
        } else if (topic.ratio >= 0.8) {
          if (!strongTopics.includes(topic.topicName)) strongTopics.push(topic.topicName);
        }
      }
    }
  }

  const courseLessonIds = new Set(course.lessonIds);
  const now = new Date().toISOString();
  let flashcardsDue = 0;
  for (const card of flashcardCache.getAll()) {
    if (courseLessonIds.has(card.lessonId) && card.state !== "graduated" && card.nextReviewDate <= now) {
      flashcardsDue++;
    }
  }

  const completedLessons = lessons.filter((l) => l.plan && l.transcript).length;

  const progressSnapshot: CourseKnowledgeIndex["progressSnapshot"] = {
    weakTopics: weakTopics.slice(0, 10),
    strongTopics: strongTopics.slice(0, 10),
    quizAverageScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 100) / 100 : 0,
    flashcardsDue,
    completedLessons,
  };

  const index: CourseKnowledgeIndex = {
    builtAt: new Date().toISOString(),
    version: (course.knowledgeIndex?.version || 0) + 1,
    overview: { totalLessons: lessons.length, topicProgression, courseThemes },
    lessonDigests,
    conceptBridges,
    loCoverage,
    progressSnapshot,
  };

  updateCourse(courseId, { knowledgeIndex: index });
  knowledgeIndexCache.set(courseId, index);
  return index;
}

// ---- Course Progress (cached 60s, batch-loaded) ----
export function getCourseProgress(courseId: string) {
  const cached = courseProgressCache.get(courseId);
  if (cached) return cached;

  const course = getCourse(courseId);
  if (!course) return null;

  const lessons = course.lessonIds
    .map((id: string) => lessonCache.get(id))
    .filter((l): l is Lesson => l !== null);

  const courseLessonIds = new Set(course.lessonIds as string[]);
  const fcStatsMap = new Map<string, { total: number; new: number; learning: number; review: number; graduated: number }>();
  const now = new Date().toISOString();
  let dueCount = 0;

  for (const card of flashcardCache.getAll()) {
    if (!courseLessonIds.has(card.lessonId)) continue;
    let stats = fcStatsMap.get(card.lessonId);
    if (!stats) {
      stats = { total: 0, new: 0, learning: 0, review: 0, graduated: 0 };
      fcStatsMap.set(card.lessonId, stats);
    }
    stats.total++;
    switch (card.state) {
      case "new": stats.new++; break;
      case "learning": stats.learning++; break;
      case "review": stats.review++; break;
      case "graduated": stats.graduated++; break;
    }
    if (card.state !== "graduated" && card.nextReviewDate <= now) dueCount++;
  }

  const emptyFcStats = { total: 0, new: 0, learning: 0, review: 0, graduated: 0 };

  const lessonStatuses = lessons.map((lesson: Lesson) => {
    const packs = lesson.quizPacks || [];
    const quizScores = packs
      .filter((p) => typeof p.lastScore === "number")
      .map((p) => p.lastScore as number);

    return {
      lessonId: lesson.id,
      title: lesson.title || "Untitled",
      hasTranscript: !!lesson.transcript,
      hasPlan: !!lesson.plan,
      quizScores,
      flashcardStats: fcStatsMap.get(lesson.id) || emptyFcStats,
    };
  });

  const allScores = lessonStatuses.flatMap((s) => s.quizScores);
  const overallQuizAvg = allScores.length > 0
    ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length
    : 0;

  let fcTotal = 0, fcNew = 0, fcLearning = 0, fcReview = 0, fcGraduated = 0;
  for (const stats of fcStatsMap.values()) {
    fcTotal += stats.total;
    fcNew += stats.new;
    fcLearning += stats.learning;
    fcReview += stats.review;
    fcGraduated += stats.graduated;
  }
  const flashcardSummary = {
    total: fcTotal, new: fcNew, learning: fcLearning, review: fcReview, graduated: fcGraduated, due: dueCount,
  };

  const weakTopics: string[] = [];
  const strongTopics: string[] = [];
  for (const lesson of lessons) {
    const weakness = weaknessService.getWeaknessForLesson(lesson.id);
    if (weakness?.topics) {
      for (const topic of weakness.topics) {
        if (topic.isWeak && !weakTopics.includes(topic.topicName)) {
          weakTopics.push(topic.topicName);
        } else if (topic.ratio >= 0.8 && !strongTopics.includes(topic.topicName)) {
          strongTopics.push(topic.topicName);
        }
      }
    }
  }

  const completedLessons = lessons.filter((l: Lesson) => l.plan && l.transcript).length;

  const result = {
    courseId,
    totalLessons: lessons.length,
    completedLessons,
    lessonStatuses,
    overallQuizAvg,
    flashcardSummary,
    weakTopics,
    strongTopics,
  };

  courseProgressCache.set(courseId, result);
  return result;
}

// ---- Course Export (batch-loaded) ----
export function exportCourseData(courseId: string) {
  const course = getCourse(courseId);
  if (!course) return null;

  const lessons = course.lessonIds
    .map((id: string) => lessonCache.get(id))
    .filter((l): l is Lesson => l !== null);

  const lessonExports = lessons.map((l: Lesson) => ({
    id: l.id,
    title: l.title || "Untitled",
    plan: l.plan || undefined,
    cheatSheet: l.cheatSheet || undefined,
  }));

  const courseLessonIds = new Set(course.lessonIds as string[]);
  const allFlashcards = flashcardCache.filter((c) => courseLessonIds.has(c.lessonId));

  const weakTopics: string[] = [];
  for (const lesson of lessons) {
    const weakness = weaknessService.getWeaknessForLesson(lesson.id);
    if (weakness?.topics) {
      for (const topic of weakness.topics) {
        if (topic.isWeak && !weakTopics.includes(topic.topicName)) {
          weakTopics.push(topic.topicName);
        }
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    course,
    lessons: lessonExports,
    flashcards: allFlashcards,
    weakTopics,
  };
}
