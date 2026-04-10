// services/loProgressService.ts
// Computes Learning Outcome mastery from quiz scores, flashcard states, and lesson coverage.

import { getCourse, type Course } from "../controllers/courseController";
import { lessonCache } from "../cache";
import { logger } from "../utils/logger";
import type { LOProgress, LODashboardData } from "../types/loProgress";

type MasteryLevel = LOProgress["masteryLevel"];

function computeMasteryLevel(confidence: number): MasteryLevel {
  if (confidence < 0.2) return "not_started";
  if (confidence < 0.4) return "beginning";
  if (confidence < 0.6) return "developing";
  if (confidence < 0.8) return "proficient";
  return "mastered";
}

function computeRecommendation(
  masteryLevel: MasteryLevel,
  hasFlashcards: boolean,
  hasQuiz: boolean
): string {
  switch (masteryLevel) {
    case "not_started":
      return "study_module";
    case "beginning":
      return hasFlashcards ? "review_flashcards" : "study_module";
    case "developing":
      return hasQuiz ? "take_quiz" : "review_flashcards";
    case "proficient":
      return "take_quiz";
    case "mastered":
      return "complete";
  }
}

/**
 * Compute LO progress for a course.
 * Weights: 40% quiz average + 30% flashcard graduation + 20% lesson coverage + 10% LO module completion
 */
export function computeLOProgress(courseId: string): LODashboardData | null {
  const course = getCourse(courseId);
  if (!course) return null;

  const los = course.learningOutcomes || [];
  if (los.length === 0) {
    return {
      courseId,
      courseName: `${course.code} - ${course.name}`,
      totalLOs: 0,
      loProgress: [],
      overallMastery: 0,
      studyPriority: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const ki = course.knowledgeIndex;
  const loCoverage = ki?.loCoverage || [];
  const lessonIds = course.lessonIds || [];

  const loProgressList: LOProgress[] = [];

  // Pre-fetch all contributing lessons at once via cache (O(1) per lookup, eliminates N+1)
  const allContributingIds = new Set<string>();
  for (let i = 0; i < los.length; i++) {
    const loId = `LO${i + 1}`;
    const coverageEntry = loCoverage.find((lc: any) => lc.loId === loId);
    if (coverageEntry?.coveredByLessons) {
      for (const lid of coverageEntry.coveredByLessons) allContributingIds.add(lid);
    }
  }
  const lessonMap = new Map<string, any>();
  for (const lid of allContributingIds) {
    const lesson = lessonCache.get(lid);
    if (lesson) lessonMap.set(lid, lesson);
  }

  for (let i = 0; i < los.length; i++) {
    const loTitle = los[i];
    const loId = `LO${i + 1}`;

    // Find contributing lessons from knowledge index
    const coverageEntry = loCoverage.find((lc: any) => lc.loId === loId);
    const contributingLessons = coverageEntry?.coveredByLessons || [];

    // 1. Quiz scores (40% weight)
    const quizScores: number[] = [];
    for (const lid of contributingLessons) {
      const lesson = lessonMap.get(lid);
      if (!lesson?.quizPacks) continue;
      for (const pack of lesson.quizPacks) {
        if (typeof pack.lastScore === "number") {
          quizScores.push(pack.lastScore / 100);
        }
      }
    }
    const quizAvg = quizScores.length > 0
      ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
      : 0;

    // 2. Flashcard mastery (30% weight)
    let fcTotal = 0, fcGraduated = 0, fcLearning = 0, fcNew = 0;
    for (const lid of contributingLessons) {
      const lesson = lessonMap.get(lid);
      if (!lesson) continue;
      const progress = lesson.progress as any;
      if (progress?.flashcardStats) {
        fcTotal += progress.flashcardStats.total || 0;
        fcGraduated += progress.flashcardStats.graduated || 0;
        fcLearning += progress.flashcardStats.learning || 0;
        fcNew += progress.flashcardStats.new || 0;
      }
    }
    const fcGradRate = fcTotal > 0 ? fcGraduated / fcTotal : 0;

    // 3. Lesson coverage (20% weight)
    const lessonsWithPlan = contributingLessons.filter((lid: string) => {
      return lessonMap.get(lid)?.plan;
    }).length;
    const lessonCoverage = contributingLessons.length > 0
      ? lessonsWithPlan / contributingLessons.length
      : 0;

    // 4. LO module completion (10% weight)
    let loModuleExists = 0;
    for (const lid of contributingLessons) {
      const lesson = lessonMap.get(lid);
      if (lesson?.loModules?.modules?.some((m: any) => m.loId === loId)) {
        loModuleExists++;
      }
    }
    const loModuleRate = contributingLessons.length > 0
      ? loModuleExists / contributingLessons.length
      : 0;

    // Weighted overall confidence
    const overallConfidence = Math.min(1, Math.max(0,
      quizAvg * 0.4 + fcGradRate * 0.3 + lessonCoverage * 0.2 + loModuleRate * 0.1
    ));

    const masteryLevel = computeMasteryLevel(overallConfidence);

    loProgressList.push({
      loId,
      loTitle,
      lessonsContributing: contributingLessons,
      quizScores,
      flashcardMastery: { total: fcTotal, graduated: fcGraduated, learning: fcLearning, new: fcNew },
      overallConfidence,
      masteryLevel,
      recommendedNext: computeRecommendation(masteryLevel, fcTotal > 0, quizScores.length > 0),
    });
  }

  // Study priority: weakest first
  const studyPriority = [...loProgressList]
    .sort((a, b) => a.overallConfidence - b.overallConfidence)
    .filter(lo => lo.masteryLevel !== "mastered")
    .map(lo => lo.loId);

  const overallMastery = loProgressList.length > 0
    ? loProgressList.reduce((sum, lo) => sum + lo.overallConfidence, 0) / loProgressList.length
    : 0;

  const result: LODashboardData = {
    courseId,
    courseName: `${course.code} - ${course.name}`,
    totalLOs: los.length,
    loProgress: loProgressList,
    overallMastery,
    studyPriority,
    generatedAt: new Date().toISOString(),
  };

  logger.info(`[LO_PROGRESS] courseId=${courseId} | LOs=${los.length} mastery=${(overallMastery * 100).toFixed(0)}%`);
  return result;
}
