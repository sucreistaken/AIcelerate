// services/lessonAiService.ts
// AI orchestration for lesson-related features.
// Handles model calls, retry logic, response parsing.

import { logger } from "../utils/logger";
import { getModel, stripCodeFences, tryParseJSON } from "./aiService";
import {
  buildPlanFromTextPrompt,
  buildChatContext,
  buildChatPrompt,
} from "../prompts/lessonPrompts";
// Re-export domain services for backward-compatible imports
export { generateMindmap, generateMindmapModule, generateMindmapNodeDetail } from "./mindmapAiService";
export { generateQuizFromPlan, generateQuizAnswers, evaluateQuizAnswer, evaluateQuizBatch } from "./quizAiService";
import { getDigestOrFallback } from "./lessonDigestService";
import { assembleCourseContext } from "../controllers/contextAssembler";
import type { Lesson } from "../controllers/lessonControllers";
import type { LessonPlan, ChatMessage } from "../types";

function logAI(label: string, inputLen: number, outputLen: number, maxTokens: number) {
  logger.info(`[AI] ${label} | ~${Math.ceil(inputLen / 4)} in, ~${Math.ceil(outputLen / 4)} out | max=${maxTokens}`);
}

// ---- Plan Generation ----
export async function generatePlan(
  lectureText: string, slidesText: string,
  courseCode?: string, learningOutcomes?: string[]
): Promise<LessonPlan> {
  const LEC = lectureText.slice(0, 18000);
  const SLD = slidesText.slice(0, 18000);
  const LO_BLOCK = Array.isArray(learningOutcomes) && learningOutcomes.length
    ? learningOutcomes.map((lo, i) => `${i + 1}. ${String(lo || "").trim()}`).join("\n")
    : "—";

  const prompt = buildPlanFromTextPrompt(LEC, SLD, courseCode, LO_BLOCK);

  let plan: LessonPlan | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 2000 * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        logger.warn(`[PLAN] Retry attempt ${attempt + 1}...`);
      }
      const result = await getModel().generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000 },
      });
      const rawText = result.response.text() || "";
      logAI("PLAN_FROM_TEXT", prompt.length, rawText.length, 8000);
      const cleaned = stripCodeFences(rawText);
      plan = tryParseJSON(cleaned);
      if (plan) break;
      lastError = cleaned.slice(0, 2000);
      logger.error(`[Parse FAIL attempt ${attempt + 1}]:`, lastError.slice(0, 500));
    } catch (retryErr: unknown) {
      lastError = retryErr instanceof Error ? retryErr.message : "AI call failed";
      logger.error(`[PLAN attempt ${attempt + 1} error]:`, lastError);
      if (attempt === 2) throw retryErr;
    }
  }
  if (!plan) {
    throw Object.assign(new Error("LLM JSON parse error after retries"), { llmText: lastError });
  }
  return plan;
}

// ---- Chat ----
export function buildChatContextForLesson(lesson: Lesson, lessonId: string, message: string, history?: ChatMessage[]) {
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
    lessonContentBlock = `=== TRANSCRIPT EXCERPT ===\n${(lesson.transcript || "").slice(0, 8000)}\n\n=== SLIDE CONTENT EXCERPT ===\n${(lesson.slideText || "").slice(0, 5000)}`;
  } else {
    const { context: digestCtx, isDigest } = getDigestOrFallback(lessonId);
    if (isDigest) {
      lessonContentBlock = `=== LESSON DIGEST ===\n${digestCtx}`;
    } else {
      lessonContentBlock = `=== TRANSCRIPT EXCERPT ===\n${(lesson.transcript || "").slice(0, 4000)}\n\n=== SLIDE CONTENT EXCERPT ===\n${(lesson.slideText || "").slice(0, 2000)}`;
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

  const prompt = buildChatPrompt(context, message, courseCtx.courseId);
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
      generationConfig: { maxOutputTokens: 2500 },
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
    generationConfig: { maxOutputTokens: 2500 },
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

