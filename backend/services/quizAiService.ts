import { logger } from "../utils/logger";
import { getModel, stripCodeFences, tryParseJSON, getTemperature } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import {
  buildQuizFromPlanPrompt,
  buildQuizAnswersPrompt,
  buildQuizEvalPrompt,
  buildQuizEvalBatchPrompt,
} from "../prompts/lessonPrompts";
import type { SupportedLang } from "../utils/langDirective";
import { getDigestOrFallback } from "./lessonDigestService";
import { assembleCourseContext } from "../controllers/contextAssembler";

function logAI(label: string, inputLen: number, outputLen: number, maxTokens: number) {
  logger.info(`[AI] ${label} | ~${Math.ceil(inputLen / 4)} in, ~${Math.ceil(outputLen / 4)} out | max=${maxTokens}`);
}

function resolveContextBlock(
  lessonId?: string, lectureText?: string, slidesText?: string, maxLen = 18000
): string | null {
  if (lessonId) {
    const { context } = getDigestOrFallback(lessonId);
    if (context) return context;
    if (lectureText || slidesText) {
      return `[LEC]\n${(lectureText || "").slice(0, maxLen)}\n\n[SLIDE]\n${(slidesText || "").slice(0, maxLen)}`;
    }
    const LEC = (lectureText || "").slice(0, maxLen);
    const SLD = (slidesText || "").slice(0, maxLen);
    return `[LEC]\n${LEC}\n\n[SLIDE]\n${SLD}`;
  }
  if (lectureText && slidesText) {
    return `[LEC]\n${lectureText.slice(0, maxLen)}\n\n[SLIDE]\n${slidesText.slice(0, maxLen)}`;
  }
  return null;
}

export async function generateQuizFromPlan(
  plan: any, lessonId?: string, lang?: SupportedLang
): Promise<string[]> {
  let crossLessonHint = "";
  if (lessonId) {
    const ctx = assembleCourseContext(lessonId, "quiz");
    if (ctx.crossLessonBlock) crossLessonHint = `\n\nRELATED LESSONS:\n${ctx.crossLessonBlock}`;
  }

  const prompt = buildQuizFromPlanPrompt(JSON.stringify(plan).slice(0, 8000), crossLessonHint, lang);
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("balanced") },
  });
  const text = (result.response.text() || "").replace(/```/g, "").trim();
  logAI("QUIZ_FROM_PLAN", prompt.length, text.length, 2500);

  let questions = text.split(/\n+/).map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean).slice(0, 12);
  questions = questions.filter(q => q.split(/\s+/).length >= 5);

  const getWords = (s: string) => new Set(s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2));
  const deduplicated: string[] = [];
  for (const q of questions) {
    const qWords = getWords(q);
    const isDuplicate = deduplicated.some(existing => {
      const eWords = getWords(existing);
      const intersection = new Set([...qWords].filter(w => eWords.has(w)));
      const union = new Set([...qWords, ...eWords]);
      return union.size > 0 && intersection.size / union.size > 0.7;
    });
    if (!isDuplicate) deduplicated.push(q);
  }
  return deduplicated.slice(0, 10);
}

export async function generateQuizAnswers(
  questions: string[], lectureText?: string, slidesText?: string,
  plan?: any, lessonId?: string
): Promise<any[]> {
  const contextBlock = resolveContextBlock(lessonId, lectureText, slidesText);
  if (!contextBlock) throw new Error("lessonId or lectureText+slidesText required");

  const prompt = buildQuizAnswersPrompt(contextBlock, plan ? JSON.stringify(plan) : undefined, questions.slice(0, 20));
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.QUIZ_ANSWERS,
    } as any,
  });
  const rawResp = result.response.text() || "";
  logAI("QUIZ_ANSWERS", prompt.length, rawResp.length, 4000);
  const j = tryParseJSON(rawResp);
  if (!j?.answers) throw new Error("JSON parse/schema error");
  return j.answers;
}

export async function evaluateQuizAnswer(
  question: string, studentAnswer: string,
  lectureText?: string, slidesText?: string, lessonId?: string, lang?: SupportedLang
): Promise<any> {
  const contextBlock = resolveContextBlock(lessonId, lectureText, slidesText, 14000);
  if (!contextBlock) throw new Error("lessonId or lectureText+slidesText required");

  const prompt = buildQuizEvalPrompt(contextBlock, question, studentAnswer, lang);
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.QUIZ_EVAL,
    } as any,
  });
  const evalRaw = result.response.text() || "";
  logAI("QUIZ_EVAL", prompt.length, evalRaw.length, 800);
  const j = tryParseJSON(evalRaw);
  if (!j?.grade) throw new Error("JSON parse/schema error");
  return j;
}

export async function evaluateQuizBatch(
  items: Array<{ q: string; student_answer: string }>,
  lectureText?: string, slidesText?: string, lessonId?: string, lang?: SupportedLang
): Promise<any[]> {
  const contextBlock = resolveContextBlock(lessonId, lectureText, slidesText, 14000);
  if (!contextBlock) throw new Error("lessonId or lectureText+slidesText required");

  const questionsBlock = items.slice(0, 20).map((item, i) => `Q${i + 1}: ${item.q}\nA${i + 1}: ${item.student_answer}`).join("\n\n");
  const prompt = buildQuizEvalBatchPrompt(contextBlock, questionsBlock, lang);
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.QUIZ_EVAL_BATCH,
    } as any,
  });
  const batchRaw = result.response.text() || "";
  logAI("QUIZ_EVAL_BATCH", prompt.length, batchRaw.length, 4000);
  const j = tryParseJSON(batchRaw);
  if (!j?.results || !Array.isArray(j.results)) throw new Error("JSON parse/schema error");
  return j.results;
}
