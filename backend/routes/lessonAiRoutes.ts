import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { rateLimiter } from "../middleware/rateLimiter";
import {
  getLesson, upsertLesson,
} from "../services/lessonDataService";
import { getCourseForLesson, rebuildKnowledgeIndex } from "../controllers/courseController";
import { hasAlignment, generateAlignmentOnly, generateLoAlignmentForLesson, generateLoModules } from "../services/loModuleService";
import { generateCheatSheet } from "../services/cheatSheetService";
import { generateDigest } from "../services/lessonDigestService";
import { analyzeDeviation } from "../services/deviationService";
import { fetchIeuLearningOutcomes } from "../services/ieuService";
import {
  generatePlan, generatePlanStream,
  buildChatContextForLesson, generateChatResponseStream, generateChatResponseSync,
  generateMindmap, generateMindmapModule, generateMindmapNodeDetail,
} from "../services/lessonAiService";
import { notFound, badRequest } from "../middleware/errorHandler";
import { generateId } from "../utils/idGenerator";
import {
  planFromTextSchema,
  cheatSheetSchema, loAlignSchema, chatSchema,
  mindmapModuleSchema, mindmapNodeDetailSchema,
} from "../validators/lessonSchemas";
import { emptyBodySchema } from "../validators/routeSchemas";
import type { AlignmentItem } from "../types";
import type { SupportedLang } from "../utils/langDirective";
import { logger } from "../utils/logger";
import { scoreArtifact } from "../services/confidenceService";
import { setupSSE } from "../utils/sse";

const router = Router();

// ---- Cheat Sheet ----
router.post("/lessons/:id/cheat-sheet", requireAuth, rateLimiter("ai:cheat-sheet", 10, 60_000), validate(cheatSheetSchema), asyncHandler(async (req, res) => {
  const { language, courseWide } = req.body;
  const lessonId = req.params.id;
  const { cheatSheet, cached } = await generateCheatSheet(
    lessonId, language, courseWide, req.query.force === 'true'
  );

  // Score cheat sheet confidence in background (OPT-15) — only for fresh generation
  if (!cached) {
    const lesson = getLesson(lessonId);
    scoreArtifact("cheatSheet", JSON.stringify(cheatSheet), `${lesson?.transcript?.slice(0, 1500) || ""}\n${lesson?.slideText?.slice(0, 1000) || ""}`)
      .then(score => upsertLesson({ id: lessonId, cheatSheetConfidence: score }))
      .catch(err => logger.warn(`[CONFIDENCE] CheatSheet scoring failed for ${lessonId}: ${err?.message}`));
  }

  res.json({ ok: true, lessonId, cheatSheet, cached });
}));

// ---- LO Modules ----
router.post("/lessons/:id/lo-modules", requireAuth, rateLimiter("ai:lo-modules", 10, 60_000), validate(emptyBodySchema), asyncHandler(async (req, res) => {
  const { modules, cached } = await generateLoModules(req.params.id, req.query.force === 'true');
  res.json({ ok: true, modules, lessonId: req.params.id, cached });
}));

// ---- LO Align ----
router.post("/lessons/:id/lo-align", requireAuth, validate(loAlignSchema), asyncHandler(async (req, res) => {
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
  const saved = await upsertLesson({ id: lessonId, transcript: lecture, slideText: slides, learningOutcomes: loList, loAlignment });
  res.json({ ok: true, loAlignment, lessonId: saved.id });
}));

// ---- Plan from Text ----

// Streaming plan generation via SSE
router.post("/plan-from-text/stream", requireAuth, rateLimiter("ai:plan-from-text", 10, 60_000), validate(planFromTextSchema), async (req, res) => {
  const { lectureText, slidesText, title, lessonId: reqLessonId, courseCode, learningOutcomes } = req.body;

  // At least one content source required
  if (!lectureText?.trim() && !slidesText?.trim()) {
    return res.status(400).json({ ok: false, error: "At least slides or transcript is required" });
  }

  const { send } = setupSSE(res);

  try {
    // Resolve language from course
    const course = reqLessonId ? getCourseForLesson(reqLessonId) : null;
    const lang = (course?.settings?.language as SupportedLang) || "tr";

    const plan = await generatePlanStream(res, lectureText, slidesText, courseCode, learningOutcomes, lang);

    // Save lesson (same logic as non-streaming endpoint)
    const lId = reqLessonId || generateId("lec");
    const lessonTitle = title || plan.topic || "Untitled Lesson";

    await upsertLesson({
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
    generateDigest(lId, lectureText, slidesText, plan).catch(err => logger.warn({ err: err?.message }, "[Background] Digest generation failed"));

    // Pre-generate cheat sheet in background (OPT-8)
    generateCheatSheet(lId, lang, false, false).catch(err => {
      logger.warn(`[PRE-GEN] CheatSheet failed for ${lId}: ${err?.message}`);
    });

    // Score plan confidence in background (OPT-15)
    scoreArtifact("plan", JSON.stringify(plan), `${lectureText?.slice(0, 1500) || ""}\n${slidesText?.slice(0, 1000) || ""}`)
      .then(score => upsertLesson({ id: lId, planConfidence: score }))
      .catch(err => logger.warn(`[CONFIDENCE] Plan scoring failed for ${lId}: ${err?.message}`));

    // Send final done event — always attempt even if client appears disconnected
    // (the plan is already saved, frontend needs the lessonId to navigate)
    send({ type: "done", plan, lessonId: lId });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "Stream error in plan generation");
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: message });
    } else {
      send({ type: "error", message });
      res.end();
    }
  }
});

router.post("/plan-from-text", requireAuth, rateLimiter("ai:plan-from-text", 10, 60_000), validate(planFromTextSchema), asyncHandler(async (req, res) => {
  const { lectureText, slidesText, alignOnly, prevPlan, lessonId, title, courseCode, learningOutcomes } = req.body;

  if (!lectureText?.trim() && !slidesText?.trim()) {
    return res.status(400).json({ ok: false, error: "At least slides or transcript is required" });
  }

  if (alignOnly) {
    if (!prevPlan) throw badRequest("prevPlan is required when alignOnly = true");
    const alignment = await generateAlignmentOnly(lectureText, slidesText);
    const plan = { ...prevPlan, alignment };
    const saved = await upsertLesson({
      id: lessonId, title: title || prevPlan?.topic || "Lecture",
      transcript: lectureText, slideText: slidesText, plan,
      summary: plan?.summary, highlights: plan?.key_concepts || [],
      professorEmphases: plan?.emphases || [], courseCode, learningOutcomes,
    });
    return res.json({ ok: true, plan, lessonId: saved.id });
  }

  // Resolve language from course
  const courseForLang = lessonId ? getCourseForLesson(lessonId) : null;
  const lang = (courseForLang?.settings?.language as SupportedLang) || "tr";

  let plan = await generatePlan(lectureText, slidesText, courseCode, learningOutcomes, lang);
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
  const saved = await upsertLesson({
    id: lessonId, title: inferredTitle, transcript: lectureText, slideText: slidesText,
    plan, summary: plan?.summary, highlights: plan?.key_concepts || [],
    professorEmphases: plan?.emphases || [], courseCode, learningOutcomes,
  });

  const lessonCourse = getCourseForLesson(saved.id);
  if (lessonCourse) rebuildKnowledgeIndex(lessonCourse.id);
  generateDigest(saved.id, lectureText, slidesText, plan).catch(err => logger.warn({ err: err?.message }, "[Background] Digest generation failed"));

  // Pre-generate cheat sheet in background (OPT-8)
  generateCheatSheet(saved.id, lang, false, false).catch(err => {
    logger.warn(`[PRE-GEN] CheatSheet failed for ${saved.id}: ${err?.message}`);
  });

  // Score plan confidence in background (OPT-15)
  scoreArtifact("plan", JSON.stringify(plan), `${lectureText?.slice(0, 1500) || ""}\n${slidesText?.slice(0, 1000) || ""}`)
    .then(score => upsertLesson({ id: saved.id, planConfidence: score }))
    .catch(err => logger.warn(`[CONFIDENCE] Plan scoring failed for ${saved.id}: ${err?.message}`));

  res.json({ ok: true, plan, lessonId: saved.id });
}));

// ---- Deviation ----
router.post("/lessons/:id/deviation", requireAuth, rateLimiter("ai:deviation", 10, 60_000), validate(emptyBodySchema), asyncHandler(async (req, res) => {
  const { deviation, cached } = await analyzeDeviation(req.params.id, req.query.force === 'true');
  res.json({ ok: true, lessonId: req.params.id, deviation, cached });
}));

// ---- IEU Learning Outcomes ----
router.get("/ieu/learning-outcomes", requireAuth, asyncHandler(async (req, res) => {
  const result = await fetchIeuLearningOutcomes(String(req.query.code || ""));
  if (!result.learningOutcomes.length) {
    return res.json({ ok: false, error: "Learning Outcomes section not found.", url: result.url });
  }
  res.json({ ok: true, ...result });
}));

// ---- Chat (Deep Dive Solo) ----
router.post("/lessons/:id/chat", requireAuth, rateLimiter("ai:lesson-chat", 15, 60_000), validate(chatSchema), asyncHandler(async (req, res) => {
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
router.post("/lessons/:id/mindmap", requireAuth, rateLimiter("ai:mindmap", 10, 60_000), validate(emptyBodySchema), asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.plan) throw notFound("Plan not found");

  if (req.query.force !== 'true' && lesson.mindmapCache?.code) {
    return res.json({ ok: true, code: lesson.mindmapCache.code, cached: true });
  }

  const code = await generateMindmap(lesson, lessonId);
  await upsertLesson({ id: lessonId, mindmapCache: { code, generatedAt: new Date().toISOString() } });
  res.json({ ok: true, code });
}));

// ---- Mindmap Module ----
router.post("/lessons/:id/mindmap/module", requireAuth, validate(mindmapModuleSchema), asyncHandler(async (req, res) => {
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
  await upsertLesson({ id: lessonId, mindmapModuleCache: existingModuleCache });
  res.json({ ok: true, code, moduleTitle });
}));

// ---- Mindmap Node Detail ----
router.post("/lessons/:id/mindmap/node-detail", requireAuth, validate(mindmapNodeDetailSchema), asyncHandler(async (req, res) => {
  const lesson = getLesson(req.params.id);
  if (!lesson) throw notFound("Lesson not found");

  const result = await generateMindmapNodeDetail(lesson, req.body.nodeName, req.body.action);
  res.json({ ok: true, ...result });
}));

export default router;
