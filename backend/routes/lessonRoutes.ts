import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import {
  listLessons, getLesson, upsertLesson, updateProgress, deleteLesson, getMemory,
} from "../controllers/lessonControllers";
import { getCourseForLesson, removeLessonFromCourse, rebuildKnowledgeIndex } from "../controllers/courseController";
import { assembleCourseContext } from "../controllers/contextAssembler";
import { hasAlignment, generateAlignmentOnly, generateLoAlignmentForLesson, generateLoModules } from "../services/loModuleService";
import { generateCheatSheet } from "../services/cheatSheetService";
import { generateDigest } from "../services/lessonDigestService";
import { analyzeDeviation } from "../services/deviationService";
import { fetchIeuLearningOutcomes } from "../services/ieuService";
import {
  generatePlan, generatePlanStream, generateQuizFromPlan, generateQuizAnswers,
  evaluateQuizAnswer, evaluateQuizBatch,
  buildChatContextForLesson, generateChatResponseStream, generateChatResponseSync,
  generateMindmap, generateMindmapModule, generateMindmapNodeDetail,
} from "../services/lessonAiService";
import { notFound, badRequest } from "../middleware/errorHandler";
import {
  upsertLessonSchema, progressSchema, planFromTextSchema,
  cheatSheetSchema, loAlignSchema, chatSchema,
  mindmapModuleSchema, mindmapNodeDetailSchema,
} from "../validators/lessonSchemas";
import {
  quizFromPlanSchema, quizAnswersSchema, quizEvalSchema, quizEvalBatchSchema,
} from "../validators/quizSchemas";
import type { PlanModule, AlignmentItem } from "../types";

const router = Router();

// ---- Lesson CRUD ----
router.get("/lessons", (_req, res) => res.json(listLessons()));

router.get("/lessons/:id", (req, res) => {
  const l = getLesson(req.params.id);
  if (!l) throw notFound("Lesson not found");
  res.json(l);
});

router.post("/lessons", validate(upsertLessonSchema), (req, res) => {
  res.json(upsertLesson(req.body));
});

router.patch("/lessons/:id/progress", validate(progressSchema), (req, res) => {
  const l = updateProgress(req.params.id, req.body);
  if (!l) throw notFound("Lesson not found");
  res.json(l);
});

router.delete("/lessons/:id", (req, res) => {
  const lessonId = req.params.id;
  // Silmeden önce ilişkili kurstan çıkar
  const course = getCourseForLesson(lessonId);
  if (course) {
    removeLessonFromCourse(course.id, lessonId);
    rebuildKnowledgeIndex(course.id);
  }
  if (!deleteLesson(lessonId)) throw notFound("Lesson not found");
  res.json({ ok: true, deleted: lessonId });
});

router.get("/memory", (_req, res) => res.json(getMemory()));

// ---- Cheat Sheet ----
router.post("/lessons/:id/cheat-sheet", validate(cheatSheetSchema), asyncHandler(async (req, res) => {
  const { language, courseWide } = req.body;
  const { cheatSheet, cached } = await generateCheatSheet(
    req.params.id, language, courseWide, req.query.force === 'true'
  );
  res.json({ ok: true, lessonId: req.params.id, cheatSheet, cached });
}));

// ---- LO Modules ----
router.post("/lessons/:id/lo-modules", asyncHandler(async (req, res) => {
  const { modules, cached } = await generateLoModules(req.params.id, req.query.force === 'true');
  res.json({ ok: true, modules, lessonId: req.params.id, cached });
}));

// ---- LO Align ----
router.post("/lessons/:id/lo-align", validate(loAlignSchema), asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const existing = getLesson(lessonId);
  if (!existing) throw notFound("Lesson not found");

  if (req.query.force !== 'true' && existing.loAlignment?.segments?.length) {
    return res.json({ ok: true, loAlignment: existing.loAlignment, lessonId, cached: true });
  }

  const lecture = (req.body.transcript ?? existing.transcript ?? "").trim();
  const slides = req.body.slidesText ?? existing.slideText ?? "";
  const loList = (req.body.learningOutcomes?.length ? req.body.learningOutcomes : existing.learningOutcomes) || [];
  if (!lecture) throw badRequest("Transcript is required");
  if (!loList.length) throw badRequest("Learning Outcomes list is required");

  const loAlignment = await generateLoAlignmentForLesson(lecture, slides, loList);
  const saved = upsertLesson({ id: lessonId, transcript: lecture, slideText: slides, learningOutcomes: loList, loAlignment });
  res.json({ ok: true, loAlignment, lessonId: saved.id });
}));

// ---- Plan from Text ----

// Streaming plan generation via SSE
router.post("/plan-from-text/stream", async (req, res) => {
  const parsed = planFromTextSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues.map(i => i.message).join(", ") });
  }

  const { lectureText, slidesText, title, lessonId: reqLessonId, courseCode, learningOutcomes } = parsed.data;

  // At least one content source required
  if (!lectureText?.trim() && !slidesText?.trim()) {
    return res.status(400).json({ ok: false, error: "At least slides or transcript is required" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Track client disconnect
  let aborted = false;
  req.on("close", () => { aborted = true; });

  try {
    const plan = await generatePlanStream(res, lectureText, slidesText, courseCode, learningOutcomes);

    // Save lesson (same logic as non-streaming endpoint)
    const lId = reqLessonId || `lec-${Date.now()}`;
    const lessonTitle = title || plan.topic || "Untitled Lesson";

    upsertLesson({
      id: lId,
      title: lessonTitle,
      transcript: lectureText,
      slideText: slidesText,
      plan,
      summary: plan.alignment?.summary_chatty || "",
      highlights: plan.key_concepts || [],
      professorEmphases: plan.emphases || [],
      courseCode,
      learningOutcomes,
    });

    // Calculate alignment duration
    if (plan.alignment?.items) {
      const durations = plan.alignment.items.map(it => it.duration_min ?? 0).filter(d => d > 0);
      if (durations.length) {
        plan.alignment.average_duration_min = parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1));
      }
    }

    // Generate digest in background
    generateDigest(lId, lectureText, slidesText, plan).catch(() => {});

    // Send final done event
    if (aborted) { res.end(); return; }
    res.write(`data: ${JSON.stringify({ type: "done", plan, lessonId: lId })}\n\n`);
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

router.post("/plan-from-text", validate(planFromTextSchema), asyncHandler(async (req, res) => {
  const { lectureText, slidesText, alignOnly, prevPlan, lessonId, title, courseCode, learningOutcomes } = req.body;

  if (!lectureText?.trim() && !slidesText?.trim()) {
    return res.status(400).json({ ok: false, error: "At least slides or transcript is required" });
  }

  if (alignOnly) {
    if (!prevPlan) throw badRequest("prevPlan is required when alignOnly = true");
    const alignment = await generateAlignmentOnly(lectureText, slidesText);
    const plan = { ...prevPlan, alignment };
    const saved = upsertLesson({
      id: lessonId, title: title || prevPlan?.topic || "Lecture",
      transcript: lectureText, slideText: slidesText, plan,
      summary: plan?.summary, highlights: plan?.key_concepts || [],
      professorEmphases: plan?.emphases || [], courseCode, learningOutcomes,
    });
    return res.json({ ok: true, plan, lessonId: saved.id });
  }

  let plan = await generatePlan(lectureText, slidesText, courseCode, learningOutcomes);
  if (!hasAlignment(plan)) {
    try { const alignment = await generateAlignmentOnly(lectureText, slidesText); plan = { ...plan, alignment }; }
    catch { /* alignment fallback failed, continue without */ }
  }
  if (!hasAlignment(plan) && plan?.alignment?.items?.length) {
    const items = plan.alignment.items;
    const valid = items.filter((x: AlignmentItem) => Number.isFinite(x.duration_min));
    const avg = valid.reduce((a: number, b: AlignmentItem) => a + b.duration_min, 0) / Math.max(1, valid.length);
    plan.alignment.average_duration_min = Number.isFinite(avg) ? +avg.toFixed(1) : undefined;
  }

  const inferredTitle = title || plan?.topic || (plan?.modules?.[0]?.title ? `Lecture – ${plan.modules[0].title}` : "Lecture");
  const saved = upsertLesson({
    id: lessonId, title: inferredTitle, transcript: lectureText, slideText: slidesText,
    plan, summary: plan?.summary, highlights: plan?.key_concepts || [],
    professorEmphases: plan?.emphases || [], courseCode, learningOutcomes,
  });

  const lessonCourse = getCourseForLesson(saved.id);
  if (lessonCourse) rebuildKnowledgeIndex(lessonCourse.id);
  generateDigest(saved.id, lectureText, slidesText, plan).catch(() => {});

  res.json({ ok: true, plan, lessonId: saved.id });
}));

// ---- Quiz ----
router.post("/quiz-from-plan", validate(quizFromPlanSchema), asyncHandler(async (req, res) => {
  const questions = await generateQuizFromPlan(req.body.plan, req.body.lessonId);
  res.json({ ok: true, questions });
}));

router.post("/quiz-answers", validate(quizAnswersSchema), asyncHandler(async (req, res) => {
  const { questions, lectureText, slidesText, plan, lessonId } = req.body;
  const answers = await generateQuizAnswers(questions, lectureText, slidesText, plan, lessonId);
  res.json({ ok: true, answers });
}));

router.post("/quiz-eval", validate(quizEvalSchema), asyncHandler(async (req, res) => {
  const { q, student_answer, lectureText, slidesText, lessonId } = req.body;
  const evalResult = await evaluateQuizAnswer(q, student_answer, lectureText, slidesText, lessonId);
  res.json({ ok: true, ...evalResult });
}));

router.post("/quiz-eval-batch", validate(quizEvalBatchSchema), asyncHandler(async (req, res) => {
  const { items, lectureText, slidesText, lessonId } = req.body;
  const results = await evaluateQuizBatch(items, lectureText, slidesText, lessonId);
  res.json({ ok: true, results });
}));

// ---- Deviation ----
router.post("/lessons/:id/deviation", asyncHandler(async (req, res) => {
  const { deviation, cached } = await analyzeDeviation(req.params.id, req.query.force === 'true');
  res.json({ ok: true, lessonId: req.params.id, deviation, cached });
}));

// ---- IEU Learning Outcomes ----
router.get("/ieu/learning-outcomes", asyncHandler(async (req, res) => {
  const result = await fetchIeuLearningOutcomes(String(req.query.code || ""));
  if (!result.learningOutcomes.length) {
    return res.json({ ok: false, error: "Learning Outcomes section not found.", url: result.url });
  }
  res.json({ ok: true, ...result });
}));

// ---- Chat (Deep Dive Solo) ----
router.post("/lessons/:id/chat", validate(chatSchema), asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const { message, history } = req.body;
  const lesson = getLesson(lessonId);
  if (!lesson) throw notFound("Lesson not found");

  const { prompt, history: chatHistory } = buildChatContextForLesson(lesson, lessonId, message, history);

  if (req.query.stream === 'true') {
    await generateChatResponseStream(prompt, chatHistory, res);
    return;
  }

  const { text, suggestions } = await generateChatResponseSync(prompt, chatHistory);
  res.json({ ok: true, text, suggestions });
}));

// ---- Mindmap ----
router.post("/lessons/:id/mindmap", asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.plan) throw notFound("Plan not found");

  if (req.query.force !== 'true' && lesson.mindmapCache?.code) {
    return res.json({ ok: true, code: lesson.mindmapCache.code, cached: true });
  }

  const code = await generateMindmap(lesson, lessonId);
  upsertLesson({ id: lessonId, mindmapCache: { code, generatedAt: new Date().toISOString() } });
  res.json({ ok: true, code });
}));

// ---- Modules list ----
router.get("/lessons/:id/modules", (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson || !lesson.plan) throw notFound("Lesson not found");

  const plan = lesson.plan!;
  const modules = (plan.modules || []).map((m: PlanModule, index: number) => ({
    id: index,
    title: m.title || m.name || `Module ${index + 1}`,
    topics: (m.topics || m.content || []).slice(0, 5).map(t => typeof t === 'string' ? t : (t.title || t.name || 'Topic')),
  }));

  const allModulesOption = { id: -1, title: "Tüm Modüller (Genel Bakış)", topics: modules.slice(0, 4).map(m => m.title) };
  res.json({ ok: true, lessonTitle: lesson.title || "Lesson", modules: [allModulesOption, ...modules] });
});

// ---- Mindmap Module ----
router.post("/lessons/:id/mindmap/module", validate(mindmapModuleSchema), asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const moduleIndex = req.body.moduleIndex ?? -1;
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.plan) throw notFound("Plan not found");

  const cacheKey = String(moduleIndex);
  const cached = lesson.mindmapModuleCache?.[cacheKey];
  if (req.query.force !== 'true' && cached?.code) {
    return res.json({ ok: true, code: cached.code, moduleTitle: cached.moduleTitle || "", cached: true });
  }

  const { code, moduleTitle } = await generateMindmapModule(lesson, moduleIndex);
  const existingModuleCache = lesson.mindmapModuleCache || {};
  existingModuleCache[cacheKey] = { code, generatedAt: new Date().toISOString(), moduleTitle };
  upsertLesson({ id: lessonId, mindmapModuleCache: existingModuleCache });
  res.json({ ok: true, code, moduleTitle });
}));

// ---- Mindmap Node Detail ----
router.post("/lessons/:id/mindmap/node-detail", validate(mindmapNodeDetailSchema), asyncHandler(async (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) throw notFound("Lesson not found");

  const result = await generateMindmapNodeDetail(lesson, req.body.nodeName, req.body.action);
  res.json({ ok: true, ...result });
}));

export default router;
