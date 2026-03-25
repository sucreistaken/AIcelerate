import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import {
  listCourses, getCourse, createCourse, updateCourse, deleteCourse,
  addLessonToCourse, removeLessonFromCourse, getCourseLessons,
  rebuildKnowledgeIndex, getCourseProgress, exportCourseData,
} from "../controllers/courseController";
import { upsertLesson } from "../controllers/lessonControllers";
import { generateCourseChatResponse, generateStudySchedule } from "../services/courseAiService";
import { notFound } from "../middleware/errorHandler";
import { createCourseSchema, updateCourseSchema, courseChatSchema, studyScheduleSchema } from "../validators/courseSchemas";

const router = Router();

router.get("/courses", (_req, res) => {
  res.json({ ok: true, courses: listCourses() });
});

router.get("/courses/:id", (req, res) => {
  const course = getCourse(req.params.id);
  if (!course) throw notFound("Course not found");
  res.json({ ok: true, course });
});

router.post("/courses", validate(createCourseSchema), (req, res) => {
  const course = createCourse(req.body);
  res.json({ ok: true, course });
});

router.patch("/courses/:id", validate(updateCourseSchema), (req, res) => {
  const course = updateCourse(req.params.id, req.body);
  if (!course) throw notFound("Course not found");
  res.json({ ok: true, course });
});

router.delete("/courses/:id", (req, res) => {
  if (!deleteCourse(req.params.id)) throw notFound("Course not found");
  res.json({ ok: true });
});

router.post("/courses/:id/lessons/:lessonId", (req, res) => {
  const course = addLessonToCourse(req.params.id, req.params.lessonId);
  if (!course) throw notFound("Course not found");
  upsertLesson({ id: req.params.lessonId, courseId: req.params.id });
  rebuildKnowledgeIndex(req.params.id);
  const updatedCourse = getCourse(req.params.id);
  res.json({ ok: true, course: updatedCourse });
});

router.delete("/courses/:id/lessons/:lessonId", (req, res) => {
  const course = removeLessonFromCourse(req.params.id, req.params.lessonId);
  if (!course) throw notFound("Course not found");
  upsertLesson({ id: req.params.lessonId, courseId: undefined });
  rebuildKnowledgeIndex(req.params.id);
  const updatedCourse = getCourse(req.params.id);
  res.json({ ok: true, course: updatedCourse });
});

router.get("/courses/:id/lessons", (req, res) => {
  res.json({ ok: true, lessons: getCourseLessons(req.params.id) });
});

router.post("/courses/:id/rebuild-index", (req, res) => {
  const index = rebuildKnowledgeIndex(req.params.id);
  if (!index) throw notFound("Course not found");
  res.json({ ok: true, knowledgeIndex: index });
});

router.get("/courses/:id/knowledge-index", (req, res) => {
  const course = getCourse(req.params.id);
  if (!course) throw notFound("Course not found");
  res.json({ ok: true, knowledgeIndex: course.knowledgeIndex || null });
});

router.post("/courses/:id/chat", validate(courseChatSchema), asyncHandler(async (req, res) => {
  const { text, suggestions } = await generateCourseChatResponse(req.params.id, req.body.message, req.body.history);
  res.json({ ok: true, text, suggestions });
}));

router.get("/courses/:id/progress", (req, res) => {
  const progress = getCourseProgress(req.params.id);
  if (!progress) throw notFound("Course not found");
  res.json({ ok: true, progress });
});

router.post("/courses/:id/study-schedule", validate(studyScheduleSchema), asyncHandler(async (req, res) => {
  const schedule = await generateStudySchedule(req.params.id, req.body.examDate);
  res.json({ ok: true, schedule });
}));

router.get("/courses/:id/export", (req, res) => {
  const data = exportCourseData(req.params.id);
  if (!data) throw notFound("Course not found");
  res.json({ ok: true, export: data });
});

export default router;
