// controllers/lessonControllers.ts
// HTTP-only controller — parse req, call service, send res.
// Business logic lives in services/lessonDataService.ts.

import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../middleware/errorHandler";
import {
  getLesson, listLessonsForUser, listLessonsPaginatedForUser,
  upsertLesson, updateProgress, deleteLesson, getMemory,
} from "../services/lessonDataService";
import {
  getCourseForLesson, removeLessonFromCourse, rebuildKnowledgeIndex,
} from "../services/courseDataService";
import type { PlanModule } from "../types";


// ── HTTP Handlers ───────────────────────────────────────────────────────────

export const lessonController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const cursor = req.query.cursor as string | undefined;
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 100);
    if (!cursor && !req.query.limit) {
      return res.json({ ok: true, lessons: listLessonsForUser(userId) });
    }
    res.json({ ok: true, ...listLessonsPaginatedForUser(userId, cursor, limit) });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const lesson = getLesson(req.params.id);
    if (!lesson || (lesson.userId && lesson.userId !== req.user!.userId)) {
      throw notFound("Lesson not found");
    }
    res.json({ ok: true, lesson });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await upsertLesson({ ...req.body, userId: req.user!.userId });
    res.status(201).json({ ok: true, lesson: result });
  }),

  updateProgress: asyncHandler(async (req: AuthRequest, res: Response) => {
    const existing = getLesson(req.params.id);
    if (!existing || (existing.userId && existing.userId !== req.user!.userId)) {
      throw notFound("Lesson not found");
    }
    const updated = updateProgress(req.params.id, req.body);
    if (!updated) throw notFound("Lesson not found");
    res.json({ ok: true, lesson: updated });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const lesson = getLesson(req.params.id);
    if (!lesson || (lesson.userId && lesson.userId !== req.user!.userId)) {
      throw notFound("Lesson not found");
    }
    const course = getCourseForLesson(req.params.id);
    if (course) {
      removeLessonFromCourse(course.id, req.params.id);
      rebuildKnowledgeIndex(course.id);
    }
    if (!deleteLesson(req.params.id)) throw notFound("Lesson not found");
    res.status(204).end();
  }),

  getMemory: asyncHandler(async (req: AuthRequest, res: Response) => {
    const mem = await getMemory(req.user!.userId);
    res.json({ ok: true, memory: mem });
  }),

  getModules: asyncHandler(async (req: AuthRequest, res: Response) => {
    const lesson = getLesson(req.params.id);
    if (!lesson?.plan || (lesson.userId && lesson.userId !== req.user!.userId)) {
      throw notFound("Lesson not found");
    }
    const modules = (lesson.plan.modules || []).map((m: PlanModule, i: number) => ({
      id: i,
      title: m.title || m.name || `Module ${i + 1}`,
      topics: (m.topics || m.content || []).slice(0, 5).map(
        (t) => typeof t === "string" ? t : (t.title || t.name || "Topic")
      ),
    }));
    const allModulesOption = {
      id: -1,
      title: "Tüm Modüller (Genel Bakış)",
      topics: modules.slice(0, 4).map((m) => m.title),
    };
    res.json({ ok: true, lessonTitle: lesson.title || "Lesson", modules: [allModulesOption, ...modules] });
  }),
};
