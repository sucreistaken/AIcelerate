// services/lessonAiService.ts
// AI orchestration for lesson-related features.
// Handles model calls, retry logic, response parsing.

import { logger } from "../utils/logger";
import { getModel, getTemperature, tryParseJSON, stripCodeFences } from "./aiService";
import {
  buildModulesPrompt,
  buildEmphasesPrompt,
  buildAlignmentPrompt,
  buildChatContext,
  buildChatPrompt,
} from "../prompts/lessonPrompts";
import { SCHEMAS } from "../prompts/schemas";
// Re-export domain services for backward-compatible imports
export { generateMindmap, generateMindmapModule, generateMindmapNodeDetail } from "./mindmapAiService";
export { generateQuizFromPlan, generateQuizAnswers, evaluateQuizAnswer, evaluateQuizBatch } from "./quizAiService";
import { getDigestOrFallback } from "./lessonDigestService";
import { assembleCourseContext } from "../controllers/contextAssembler";
import type { Lesson } from "../controllers/lessonControllers";
import { smartTruncate } from "../utils/smartTruncate";
import { getLangDirective } from "../utils/langDirective";
import type { LessonPlan, ChatMessage } from "../types";
import type { SupportedLang } from "../utils/langDirective";

function logAI(label: string, inputLen: number, outputLen: number, maxTokens: number) {
  logger.info(`[AI] ${label} | ~${Math.ceil(inputLen / 4)} in, ~${Math.ceil(outputLen / 4)} out | max=${maxTokens}`);
}

// ---- Retry Helper ----
async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 2000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        logger.warn(`[${label}] Retry attempt ${attempt + 1}...`);
      }
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : "AI call failed";
      logger.error(`[${label} attempt ${attempt + 1} error]:`, lastError);
      if (attempt === maxAttempts - 1) throw err;
    }
  }
  throw new Error(`${label}: all ${maxAttempts} attempts failed`);
}

// ---- Plan Sub-Call (single focused AI call with schema) ----
async function planSubCall(
  prompt: string, schema: any, maxTokens: number, label: string
): Promise<any> {
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: getTemperature("balanced"),
      responseMimeType: "application/json",
      responseSchema: schema,
    } as any,
  });
  const rawText = result.response.text() || "";
  logAI(label, prompt.length, rawText.length, maxTokens);

  // Truncation detection
  const estimatedTokens = Math.ceil(rawText.length / 4);
  if (estimatedTokens > maxTokens * 0.85) {
    logger.warn(`[${label}] Near token limit: ~${estimatedTokens}/${maxTokens}`);
  }

  // Safe JSON parse with fallback
  const parsed = tryParseJSON(rawText) ?? tryParseJSON(stripCodeFences(rawText));
  if (!parsed) {
    throw new Error(`${label}: invalid JSON (output ~${estimatedTokens} tokens, limit=${maxTokens})`);
  }
  return parsed;
}

// ---- Plan Generation (3 parallel calls) ----
export async function generatePlan(
  lectureText: string, slidesText: string,
  courseCode?: string, learningOutcomes?: string[],
  lang?: SupportedLang
): Promise<LessonPlan> {
  const LEC = smartTruncate(lectureText, 18000);
  const SLD = smartTruncate(slidesText, 18000);
  const LO_BLOCK = Array.isArray(learningOutcomes) && learningOutcomes.length
    ? learningOutcomes.map((lo, i) => `${i + 1}. ${String(lo || "").trim()}`).join("\n")
    : "—";
  const langDir = getLangDirective(lang);

  const modulesPrompt = buildModulesPrompt(LEC, SLD, courseCode, LO_BLOCK, langDir);
  const emphasesPrompt = buildEmphasesPrompt(LEC, SLD, langDir);
  const alignmentPrompt = buildAlignmentPrompt(LEC, SLD, langDir);

  // Fire all 3 in parallel
  const [modulesResult, emphasesResult, alignmentResult] = await Promise.all([
    callWithRetry(() => planSubCall(modulesPrompt, SCHEMAS.PLAN_MODULES, 10000, "PLAN_MODULES"), "PLAN_MODULES"),
    callWithRetry(() => planSubCall(emphasesPrompt, SCHEMAS.PLAN_EMPHASES, 5000, "PLAN_EMPHASES"), "PLAN_EMPHASES"),
    callWithRetry(() => planSubCall(alignmentPrompt, SCHEMAS.PLAN_ALIGNMENT, 6000, "PLAN_ALIGNMENT"), "PLAN_ALIGNMENT"),
  ]);

  // Merge into unified LessonPlan
  return {
    ...modulesResult,
    emphases: emphasesResult.emphases,
    alignment: alignmentResult.alignment,
  };
}

export async function generatePlanStream(
  res: import("express").Response,
  lectureText: string,
  slidesText: string,
  courseCode?: string,
  learningOutcomes?: string[],
  lang?: SupportedLang
): Promise<LessonPlan> {
  const LEC = smartTruncate(lectureText, 18000);
  const SLD = smartTruncate(slidesText, 18000);
  const LO_BLOCK = learningOutcomes?.length
    ? learningOutcomes.map((lo, i) => `${i + 1}. ${lo}`).join("\n")
    : "—";
  const langDir = getLangDirective(lang);

  const sendEvent = (data: Record<string, unknown>) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* client gone */ }
  };

  sendEvent({ type: "phase", phase: "analyzing", message: "Analyzing lesson content..." });

  const modulesPrompt = buildModulesPrompt(LEC, SLD, courseCode, LO_BLOCK, langDir);
  const emphasesPrompt = buildEmphasesPrompt(LEC, SLD, langDir);
  const alignmentPrompt = buildAlignmentPrompt(LEC, SLD, langDir);

  // Fire all 3 in parallel
  sendEvent({ type: "phase", phase: "generating", message: "Creating learning plan..." });

  let modulesData: any, emphasesData: any, alignmentData: any;

  const modulesP = callWithRetry(
    () => planSubCall(modulesPrompt, SCHEMAS.PLAN_MODULES, 10000, "PLAN_MODULES"), "PLAN_MODULES"
  ).then(result => {
    modulesData = result;
    // Stream modules progressively as they arrive
    if (result.modules?.length) {
      for (let i = 0; i < result.modules.length; i++) {
        sendEvent({ type: "module", index: i, total: result.modules.length, data: result.modules[i] });
      }
    }
    sendEvent({ type: "progress", tokens: 0, message: "Modules ready" });
  });

  const emphasesP = callWithRetry(
    () => planSubCall(emphasesPrompt, SCHEMAS.PLAN_EMPHASES, 5000, "PLAN_EMPHASES"), "PLAN_EMPHASES"
  ).then(result => {
    emphasesData = result;
    sendEvent({ type: "phase", phase: "emphases", message: "Extracting key insights..." });
    if (result.emphases?.length) {
      for (let i = 0; i < result.emphases.length; i++) {
        sendEvent({ type: "emphasis", index: i, total: result.emphases.length, data: result.emphases[i] });
      }
    }
  });

  const alignmentP = callWithRetry(
    () => planSubCall(alignmentPrompt, SCHEMAS.PLAN_ALIGNMENT, 6000, "PLAN_ALIGNMENT"), "PLAN_ALIGNMENT"
  ).then(result => {
    alignmentData = result;
  });

  try {
    await Promise.all([modulesP, emphasesP, alignmentP]);
  } catch (err: any) {
    sendEvent({ type: "error", message: err?.message || "Plan generation failed" });
    throw err;
  }

  // Merge into unified LessonPlan
  const plan: LessonPlan = {
    ...modulesData,
    emphases: emphasesData.emphases,
    alignment: alignmentData.alignment,
  };

  return plan;
}

// ---- Chat ----
export function buildChatContextForLesson(lesson: Lesson, lessonId: string, message: string, history?: ChatMessage[], lang?: SupportedLang) {
  const plan = lesson.plan;
  const modules = plan?.modules || [];
  const emphases = lesson.professorEmphases || plan?.emphases || [];
  const courseCtx = assembleCourseContext(lessonId, "chat", { userQuery: message });

  const deviationData = lesson.deviation;
  const deviationSummary = deviationData?.segments?.filter(s => s.deviation_type !== 'on_topic')?.slice(0, 4)?.map(s => `• [${s.deviation_type}] ${s.summary || s.topic || 'N/A'}`)?.join('\n') || '';
  const cheatSheet = lesson.cheatSheet;
  const cheatSheetHighlights = cheatSheet?.pitfalls?.slice(0, 4)?.join('\n• ') || '';
  const cheatSheetFormulas = cheatSheet?.formulas?.slice(0, 3)?.join('; ') || '';
  const loAlignment = lesson.loAlignment;
  const loSummary = loAlignment?.segments?.slice(0, 3)?.flatMap(s => s.lo_links?.map(l => l.lo_title) || [])?.filter(Boolean)?.slice(0, 5)?.join(', ') || '';

  const isFirstMessage = !history || history.length === 0;
  let lessonContentBlock: string;
  if (isFirstMessage) {
    lessonContentBlock = `=== TRANSCRIPT EXCERPT ===\n${smartTruncate(lesson.transcript || "", 8000)}\n\n=== SLIDE CONTENT EXCERPT ===\n${smartTruncate(lesson.slideText || "", 5000)}`;
  } else {
    const { context: digestCtx, isDigest } = getDigestOrFallback(lessonId);
    if (isDigest) {
      lessonContentBlock = `=== LESSON DIGEST ===\n${digestCtx}`;
    } else {
      lessonContentBlock = `=== TRANSCRIPT EXCERPT ===\n${smartTruncate(lesson.transcript || "", 4000)}\n\n=== SLIDE CONTENT EXCERPT ===\n${smartTruncate(lesson.slideText || "", 2000)}`;
    }
  }

  const context = buildChatContext(
    lesson.title || "Untitled Lesson",
    courseCtx.courseName || lesson.courseCode,
    courseCtx.courseBlock,
    modules, emphases, deviationSummary, loSummary,
    cheatSheetHighlights, cheatSheetFormulas,
    lessonContentBlock, courseCtx.crossLessonBlock, courseCtx.progressBlock
  );

  const prompt = buildChatPrompt(context, message, courseCtx.courseId, lang);
  return { prompt, history: history || [], courseCtx };
}

export async function generateChatResponseStream(
  prompt: string, history: ChatMessage[], res: import("express").Response
) {
  const timeoutMs = 30000;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
  );

  const streamResult = await Promise.race([
    getModel().generateContentStream({
      contents: [
        ...(history.map((h) => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.content }] }))),
        { role: 'user', parts: [{ text: prompt }] },
      ],
      generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
    }),
    timeoutPromise,
  ]);

  let fullText = '';
  for await (const chunk of streamResult.stream) {
    const chunkText = chunk.text();
    if (chunkText) {
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
    }
  }

  const suggestions = extractSuggestions(fullText);
  res.write(`data: ${JSON.stringify({ type: 'done', suggestions })}\n\n`);
  res.end();
}

export async function generateChatResponseSync(
  prompt: string, history: ChatMessage[]
): Promise<{ text: string; suggestions: string[] }> {
  const timeoutMs = 30000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs)
  );

  const chat = getModel().startChat({
    history: history.map((h) => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.content }] })),
    generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
  });

  const result = await Promise.race([chat.sendMessage(prompt), timeoutPromise]);
  const text = result.response.text();
  const suggestions = extractSuggestions(text);
  return { text, suggestions };
}

// ---- Helpers ----
function extractSuggestions(text: string): string[] {
  const suggestionsMatch = text.match(/💡\s*\*\*Suggested Questions:\*\*\s*([\s\S]*?)$/);
  if (!suggestionsMatch) return [];
  return suggestionsMatch[1].trim().split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(s => s.length > 5).slice(0, 3);
}

