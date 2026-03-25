import { logger } from "../utils/logger";
import { getModel, stripCodeFences, tryParseJSON } from "./aiService";
import { getLesson, upsertLesson } from "../controllers/lessonControllers";
import { assembleCourseContext } from "../controllers/contextAssembler";
import { buildCondensedContext } from "./loModuleService";
import { notFound, badRequest, AppError } from "../middleware/errorHandler";
import type { PlanEmphasis, CheatSheet } from "../types";

export function buildCheatSheetPrompt(input: {
  title: string; transcript: string; slideText: string;
  learningOutcomes?: string[]; emphases?: PlanEmphasis[]; language?: 'tr' | 'en';
}): string {
  const LEC = (input.transcript || "").slice(0, 18000);
  const SLD = (input.slideText || "").slice(0, 12000);
  const LOS = (input.learningOutcomes || []).map((x, i) => `LO${i + 1}: ${String(x || "").trim()}`).join("\n");
  const EMPH = input.emphases ? JSON.stringify(input.emphases).slice(0, 6000) : "—";
  const lang = input.language || 'tr';
  const langDirective = lang === 'tr'
    ? 'IMPORTANT: Write ALL content (title, headings, bullets, formulas, pitfalls, quickQuiz) in TURKISH. Use Turkish language only.'
    : 'IMPORTANT: Write ALL content (title, headings, bullets, formulas, pitfalls, quickQuiz) in ENGLISH. Use English language only.';

  return `
You are an exam-focused teaching assistant.

${langDirective}

Goal:
Create a ONE-PAGE "Cheat Sheet" (A4 style) from the lecture transcript + slides.
It must be ultra-condensed, high-signal, and optimized for last-minute revision.

OUTPUT: Return ONLY VALID JSON with this schema:

{
  "title": "string",
  "updatedAt": "ISO_STRING",
  "sections": [
    { "heading": "string", "bullets": ["string", "..."] }
  ],
  "formulas": ["string", "..."],
  "pitfalls": ["string", "..."],
  "quickQuiz": [{ "q": "string", "a": "string" }]
}

Rules:
- sections: 5–9 sections max
- each section bullets: 3–7 bullets max (short!!)
- formulas can be empty array if none
- pitfalls: common traps/mistakes (3–8)
- quickQuiz: 3–6 very short Q/A
- Use the professor emphases as a priority if available.
- If Learning Outcomes exist, reflect them indirectly in sections.

[LESSON TITLE]
${input.title || "Lesson"}

[LEARNING OUTCOMES]
${LOS || "—"}

[PROFESSOR EMPHASES (optional)]
${EMPH}

[TRANSCRIPT]
${LEC}

[SLIDES]
${SLD}
`.trim();
}

export async function generateCheatSheet(
  lessonId: string,
  language: 'tr' | 'en' = 'tr',
  courseWide: boolean = false,
  forceRegen: boolean = false
): Promise<{ cheatSheet: CheatSheet; cached: boolean }> {
  const lesson = getLesson(lessonId);
  if (!lesson) throw notFound("Lesson not found");

  if (!forceRegen && !courseWide && lesson.cheatSheet?.sections?.length && lesson.cheatSheet.language === language) {
    return { cheatSheet: lesson.cheatSheet, cached: true };
  }

  const title = lesson.title || "Lesson";
  if (!lesson.transcript?.trim() && !lesson.slideText) {
    throw badRequest("Transcript or slideText is required.");
  }

  const courseCtx = assembleCourseContext(lessonId, "cheat-sheet");
  const { lecContext, sldContext } = buildCondensedContext(lesson);
  let enrichedLecContext = lecContext;
  if (courseCtx.crossLessonBlock) enrichedLecContext += `\n\n--- Related Lessons ---\n${courseCtx.crossLessonBlock}`;

  const prompt = buildCheatSheetPrompt({
    title: courseCtx.courseName ? `${courseCtx.courseName} - ${title}` : title,
    transcript: enrichedLecContext, slideText: sldContext,
    learningOutcomes: lesson.learningOutcomes || [],
    emphases: lesson.plan?.emphases || lesson.professorEmphases || [], language,
  });

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 3000 },
  });
  const raw = (result.response.text() || "").trim();
  const cleaned = stripCodeFences(raw);
  const j = tryParseJSON(cleaned);
  if (!j?.sections || !Array.isArray(j.sections)) {
    throw new AppError(500, "Cheat sheet JSON/schema error", "LLM_PARSE_ERROR");
  }

  const cheatSheet = {
    title: j.title || title, updatedAt: new Date().toISOString(),
    sections: j.sections, formulas: Array.isArray(j.formulas) ? j.formulas : [],
    pitfalls: Array.isArray(j.pitfalls) ? j.pitfalls : [],
    quickQuiz: Array.isArray(j.quickQuiz) ? j.quickQuiz : [], language,
  };

  upsertLesson({ id: lessonId, cheatSheet });
  logger.info(`[AI] CHEAT_SHEET | lessonId=${lessonId} | lang=${language}`);
  return { cheatSheet, cached: false };
}
