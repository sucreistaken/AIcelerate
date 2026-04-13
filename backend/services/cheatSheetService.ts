import { logger } from "../utils/logger";
import { safeGenerate, getTemperature, tryParseJSON, stripCodeFences } from "./aiService";
import { getLesson, upsertLesson } from "./lessonDataService";
import { assembleCourseContext } from "../controllers/contextAssembler";
import { buildCondensedContext } from "./loModuleService";
import { smartTruncate } from "../utils/smartTruncate";
import { getLangDirective } from "../utils/langDirective";
import { notFound, badRequest, AppError } from "../middleware/errorHandler";
import { SCHEMAS } from "../prompts/schemas";
import type { PlanEmphasis, CheatSheet } from "../types";

export function buildCheatSheetPrompt(input: {
  title: string; transcript: string; slideText: string;
  learningOutcomes?: string[]; emphases?: PlanEmphasis[]; language?: 'tr' | 'en';
}): string {
  const LEC = smartTruncate(input.transcript || "", 18000);
  const SLD = smartTruncate(input.slideText || "", 12000);
  const LOS = (input.learningOutcomes || []).map((x, i) => `LO${i + 1}: ${String(x || "").trim()}`).join("\n");
  const EMPH = input.emphases ? JSON.stringify(input.emphases).slice(0, 6000) : "—";
  const lang = input.language || 'tr';
  const langDirective = getLangDirective(lang);

  return `You are an exam-focused teaching assistant. ${langDirective}

Create a ONE-PAGE Cheat Sheet: ultra-condensed, high-signal, last-minute revision.
Rules: 5-9 sections (3-7 bullets each), 3-8 pitfalls, 3-6 quickQuiz Q/A. Emphases are priority. Reflect LOs in sections.

[TITLE] ${input.title || "Lesson"}
[LOs] ${LOS || "—"}
[EMPHASES] ${EMPH}
[TRANSCRIPT] ${LEC}
[SLIDES] ${SLD}`.trim();
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

  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 3000, temperature: getTemperature("balanced"), responseMimeType: "application/json", responseSchema: SCHEMAS.CHEAT_SHEET as import("@google/generative-ai").ResponseSchema },
  }, { label: "cheat_sheet", timeoutMs: 45_000 });
  const rawText = result.response.text();
  const j = tryParseJSON(rawText) ?? tryParseJSON(stripCodeFences(rawText));
  if (!j) throw new AppError(500, "AI response parse error", "LLM_PARSE_ERROR");
  if (!j?.sections || !Array.isArray(j.sections)) {
    throw new AppError(500, "Cheat sheet JSON/schema error", "LLM_PARSE_ERROR");
  }

  const cheatSheet = {
    title: j.title || title, updatedAt: new Date().toISOString(),
    sections: j.sections, formulas: Array.isArray(j.formulas) ? j.formulas : [],
    pitfalls: Array.isArray(j.pitfalls) ? j.pitfalls : [],
    quickQuiz: Array.isArray(j.quickQuiz) ? j.quickQuiz : [], language,
  };

  await upsertLesson({ id: lessonId, cheatSheet });
  logger.info(`[AI] CHEAT_SHEET | lessonId=${lessonId} | lang=${language}`);
  return { cheatSheet, cached: false };
}
