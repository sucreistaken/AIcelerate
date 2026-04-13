// controllers/courseController.ts
// HTTP-only controller — parse req, call service, send res.
// Business logic lives in services/courseDataService.ts.

import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../middleware/errorHandler";
import {
  listCoursesForUser, getCourseForUser,
  createCourse, updateCourse, deleteCourse,
  addLessonToCourse, removeLessonFromCourse, getCourseLessons,
  rebuildKnowledgeIndex, getCourseProgress, exportCourseData,
  getCourse,
} from "../services/courseDataService";
import { upsertLesson } from "../services/lessonDataService";
import { generateCourseChatResponse, generateStudySchedule } from "../services/courseAiService";

// Re-export types so existing consumers don't break
export type { Course, CourseKnowledgeIndex, FlashcardStats, LessonStatus, CourseProgress } from "../types/course";

// Re-export service functions for backward compat (non-HTTP consumers)
export {
  listCourses, getCourse, listCoursesForUser, getCourseForUser,
  createCourse, updateCourse, deleteCourse,
  addLessonToCourse, removeLessonFromCourse, getCourseLessons,
  getCourseForLesson, migrateOrphanLessons,
  rebuildKnowledgeIndex, getCourseProgress, exportCourseData,
} from "../services/courseDataService";

// ── HTTP Handlers ───────────────────────────────────────────────────────────

export const courseController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({ ok: true, courses: listCoursesForUser(req.user!.userId) });
  }),

  getById: asyncHandler(async (req: AuthRequest, res: Response) => {
    const course = getCourseForUser(req.params.id, req.user!.userId);
    if (!course) throw notFound("Course not found");
    res.json({ ok: true, course });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const course = createCourse({ ...req.body, userId: req.user!.userId });
    res.status(201).json({ ok: true, course });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const course = updateCourse(req.params.id, req.body);
    if (!course) throw notFound("Course not found");
    res.json({ ok: true, course });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    if (!deleteCourse(req.params.id)) throw notFound("Course not found");
    res.json({ ok: true });
  }),

  addLesson: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const course = addLessonToCourse(req.params.id, req.params.lessonId);
    if (!course) throw notFound("Course not found");
    await upsertLesson({ id: req.params.lessonId, courseId: req.params.id });
    rebuildKnowledgeIndex(req.params.id);
    res.json({ ok: true, course: getCourse(req.params.id) });
  }),

  removeLesson: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const course = removeLessonFromCourse(req.params.id, req.params.lessonId);
    if (!course) throw notFound("Course not found");
    await upsertLesson({ id: req.params.lessonId, courseId: undefined });
    rebuildKnowledgeIndex(req.params.id);
    res.json({ ok: true, course: getCourse(req.params.id) });
  }),

  getLessons: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    res.json({ ok: true, lessons: getCourseLessons(req.params.id) });
  }),

  rebuildIndex: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const index = rebuildKnowledgeIndex(req.params.id);
    if (!index) throw notFound("Course not found");
    res.json({ ok: true, knowledgeIndex: index });
  }),

  getKnowledgeIndex: asyncHandler(async (req: AuthRequest, res: Response) => {
    const course = getCourseForUser(req.params.id, req.user!.userId);
    if (!course) throw notFound("Course not found");
    res.json({ ok: true, knowledgeIndex: course.knowledgeIndex || null });
  }),

  chat: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const { text, suggestions } = await generateCourseChatResponse(req.params.id, req.body.message, req.body.history);
    res.json({ ok: true, text, suggestions });
  }),

  getProgress: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const progress = getCourseProgress(req.params.id);
    if (!progress) throw notFound("Course not found");
    res.json({ ok: true, progress });
  }),

  studySchedule: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const schedule = await generateStudySchedule(req.params.id, req.body.examDate);
    res.json({ ok: true, schedule });
  }),

  exportData: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!getCourseForUser(req.params.id, req.user!.userId)) throw notFound("Course not found");
    const data = exportCourseData(req.params.id);
    if (!data) throw notFound("Course not found");
    res.json({ ok: true, export: data });
  }),
};
