// services/lessonAiService.ts
// AI orchestration for lesson-related features.
// Handles model calls, retry logic, response parsing.

import { logger } from "../utils/logger";
import { getModel, safeGenerate, getTemperature, tryParseJSON, stripCodeFences, trackStreamUsage } from "./aiService";
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
import { assembleCourseContext } from "./contextAssemblerService";
import type { Lesson } from "./lessonDataService";
import { smartTruncate } from "../utils/smartTruncate";
import { getLangDirective } from "../utils/langDirective";
import { withAiResilience } from "../utils/aiResilience";
import { setupSSE } from "../utils/sse";
import type { LessonPlan, ChatMessage } from "../types";
import type { SupportedLang } from "../utils/langDirective";
import { AppError } from "../middleware/errorHandler";

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
  throw new AppError(502, `${label}: all ${maxAttempts} attempts failed`, "AI_EXHAUSTED");
}

// ---- Plan Sub-Call (single focused AI call with schema) ----
async function planSubCall(
  prompt: string, schema: Record<string, unknown>, maxTokens: number, label: string
): Promise<Record<string, unknown>> {
  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: getTemperature("balanced"),
      responseMimeType: "application/json",
      responseSchema: schema as unknown as import("@google/generative-ai").ResponseSchema,
    },
  }, { label, timeoutMs: 60_000 });
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
    throw new AppError(502, `${label}: invalid JSON`, "AI_PARSE_ERROR");
  }
  return parsed as Record<string, unknown>;
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
  // Right-sized maxOutputTokens based on actual output analysis
  const [modulesResult, emphasesResult, alignmentResult] = await Promise.all([
    callWithRetry(() => planSubCall(modulesPrompt, SCHEMAS.PLAN_MODULES, 7000, "PLAN_MODULES"), "PLAN_MODULES"),
    callWithRetry(() => planSubCall(emphasesPrompt, SCHEMAS.PLAN_EMPHASES, 3500, "PLAN_EMPHASES"), "PLAN_EMPHASES"),
    callWithRetry(() => planSubCall(alignmentPrompt, SCHEMAS.PLAN_ALIGNMENT, 4500, "PLAN_ALIGNMENT"), "PLAN_ALIGNMENT"),
  ]);

  // Merge into unified LessonPlan
  return {
    ...modulesResult,
    emphases: emphasesResult.emphases as LessonPlan["emphases"],
    alignment: alignmentResult.alignment as LessonPlan["alignment"],
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

  const { send: sendEvent } = setupSSE(res);

  sendEvent({ type: "phase", phase: "analyzing", message: "Analyzing lesson content..." });

  const modulesPrompt = buildModulesPrompt(LEC, SLD, courseCode, LO_BLOCK, langDir);
  const emphasesPrompt = buildEmphasesPrompt(LEC, SLD, langDir);
  const alignmentPrompt = buildAlignmentPrompt(LEC, SLD, langDir);

  // Fire all 3 in parallel
  sendEvent({ type: "phase", phase: "generating", message: "Creating learning plan..." });

  let modulesData: Record<string, unknown> | undefined;
  let emphasesData: Record<string, unknown> | undefined;
  let alignmentData: Record<string, unknown> | undefined;

  const modulesP = callWithRetry(
    () => planSubCall(modulesPrompt, SCHEMAS.PLAN_MODULES, 10000, "PLAN_MODULES"), "PLAN_MODULES"
  ).then(result => {
    modulesData = result;
    // Stream modules progressively as they arrive
    const modules = result.modules as unknown[] | undefined;
    if (modules?.length) {
      for (let i = 0; i < modules.length; i++) {
        sendEvent({ type: "module", index: i, total: modules.length, data: modules[i] as Record<string, unknown> });
      }
    }
    sendEvent({ type: "progress", tokens: 0, message: "Modules ready" });
  });

  const emphasesP = callWithRetry(
    () => planSubCall(emphasesPrompt, SCHEMAS.PLAN_EMPHASES, 5000, "PLAN_EMPHASES"), "PLAN_EMPHASES"
  ).then(result => {
    emphasesData = result;
    sendEvent({ type: "phase", phase: "emphases", message: "Extracting key insights..." });
    const emphases = result.emphases as unknown[] | undefined;
    if (emphases?.length) {
      for (let i = 0; i < emphases.length; i++) {
        sendEvent({ type: "emphasis", index: i, total: emphases.length, data: emphases[i] as Record<string, unknown> });
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
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Plan generation failed";
    sendEvent({ type: "error", message: errMsg });
    throw err;
  }

  // Merge into unified LessonPlan
  const plan: LessonPlan = {
    ...modulesData,
    emphases: emphasesData?.emphases as LessonPlan["emphases"],
    alignment: alignmentData?.alignment as LessonPlan["alignment"],
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

  const prompt = buildChatPrompt(context, message, courseCtx.courseId ?? undefined, lang);
  return { prompt, history: history || [], courseCtx };
}

// Compress chat history: keep last 4 messages intact, summarize older ones
function compressHistory(history: ChatMessage[], keepRecent = 4): ChatMessage[] {
  if (history.length <= keepRecent) return history;

  const older = history.slice(0, -keepRecent);
  const recent = history.slice(-keepRecent);

  const summary = older
    .map((h) => `${h.role}: ${h.content.slice(0, 120)}`)
    .join("\n");

  return [
    { role: "user", content: `[Conversation summary]\n${summary}` },
    ...recent,
  ];
}

export async function generateChatResponseStream(
  prompt: string, history: ChatMessage[], res: import("express").Response
) {
  const timeoutMs = 30000;
  const startMs = Date.now();
  const modelName = "gemini-2.5-flash";
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const compressed = compressHistory(history);

  let streamResult;
  try {
    streamResult = await withAiResilience(
      async (signal) => getModel().generateContentStream({
        contents: [
          ...(compressed.map((h) => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.content }] }))),
          { role: 'user', parts: [{ text: prompt }] },
        ],
        generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("creative") },
      }, { signal }),
      { timeoutMs, label: "lesson_chat_stream", breakerKey: "gemini-2.5-flash" }
    );
  } catch (initErr: unknown) {
    const initErrMsg = initErr instanceof Error ? initErr.message : String(initErr);
    logger.error({ err: initErrMsg }, "AI stream init failed");
    trackStreamUsage("lesson_chat_stream", modelName, startMs, undefined, false);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI bağlantısı başarısız oldu, lütfen tekrar deneyin.' })}\n\n`);
    res.end();
    return;
  }

  // Detect client disconnect to stop consuming AI tokens early
  let clientDisconnected = false;
  res.on("close", () => { clientDisconnected = true; });

  let fullText = '';
  let streamSucceeded = true;
  try {
    for await (const chunk of streamResult.stream) {
      if (clientDisconnected) break; // Stop consuming AI tokens
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        try {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
        } catch {
          clientDisconnected = true;
          break;
        }
      }
    }
  } catch (streamErr: unknown) {
    // Gemini sometimes throws "Failed to parse stream" mid-response.
    // Send whatever we have so far rather than losing the entire response.
    streamSucceeded = false;
    const streamErrMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
    logger.warn({ err: streamErrMsg }, "AI stream interrupted, sending partial response");
    if (!fullText) {
      trackStreamUsage("lesson_chat_stream", modelName, startMs, undefined, false);
      if (!clientDisconnected) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'AI yanıt üretemedi, lütfen tekrar deneyin.' })}\n\n`);
        res.end();
      }
      return;
    }
  }

  // Read final usageMetadata from streamResult.response (resolves after stream drains)
  try {
    const finalResponse = await streamResult.response;
    trackStreamUsage("lesson_chat_stream", modelName, startMs, finalResponse, streamSucceeded);
  } catch {
    trackStreamUsage("lesson_chat_stream", modelName, startMs, undefined, streamSucceeded);
  }

  if (!clientDisconnected) {
    const suggestions = extractSuggestions(fullText);
    res.write(`data: ${JSON.stringify({ type: 'done', suggestions })}\n\n`);
    res.end();
  }
}

export async function generateChatResponseSync(
  prompt: string, history: ChatMessage[]
): Promise<{ text: string; suggestions: string[] }> {
  const compressed = compressHistory(history);
  const result = await safeGenerate({
    contents: [
      ...compressed.map((h) => ({
        role: (h.role === "user" ? "user" : "model") as "user" | "model",
        parts: [{ text: h.content }],
      })),
      { role: "user" as const, parts: [{ text: prompt }] },
    ],
    generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("creative") },
  }, { label: "lesson_chat_sync", timeoutMs: 30_000 });

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

