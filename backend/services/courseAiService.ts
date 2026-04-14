import { logger } from "../utils/logger";
import { getModel, safeGenerate, getTemperature, tryParseJSON, stripCodeFences, trackStreamUsage } from "./aiService";
import { getCourse, getCourseProgress } from "./courseDataService";
import { assembleCourseWideContext } from "./contextAssemblerService";
import { SCHEMAS } from "../prompts/schemas";
import { notFound, AppError } from "../middleware/errorHandler";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
import { withAiResilience } from "../utils/aiResilience";

export async function generateCourseChatResponse(
  courseId: string,
  message: string,
  history?: Array<{ role: string; content: string }>,
  lang?: SupportedLang
): Promise<{ text: string; suggestions: string[] }> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const courseCtx = assembleCourseWideContext(courseId);

  const prompt = `${getLangDirective(lang)}
=== YOUR ROLE ===
You are an EXPERT AI TUTOR for: ${course.code} - ${course.name}.

=== COURSE CONTEXT ===
${courseCtx.fullContext}

=== STUDENT MESSAGE ===
${message}

Answer directly, reference specific lessons, end with 3 suggested follow-up questions.
`;

  const result = await safeGenerate({
    contents: [
      ...(history?.map((h) => ({
        role: (h.role === "user" ? "user" : "model") as "user" | "model",
        parts: [{ text: h.content }],
      })) || []),
      { role: "user" as const, parts: [{ text: prompt }] },
    ],
    generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
  }, { label: "course_chat", timeoutMs: 30_000 });

  const text = result.response.text();
  logger.info(`[AI] COURSE_CHAT | courseId=${courseId} | ~${Math.ceil(prompt.length / 4)} in`);

  const suggestionsMatch = text.match(/\*\*Suggested Questions:\*\*\s*([\s\S]*?)$/);
  let suggestions: string[] = [];
  if (suggestionsMatch) {
    suggestions = suggestionsMatch[1].trim().split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 5).slice(0, 3);
  }

  return { text, suggestions };
}

/**
 * Streaming variant of generateCourseChatResponse — pipes Gemini chunks to SSE response.
 */
export async function generateCourseChatResponseStream(
  courseId: string,
  message: string,
  history: Array<{ role: string; content: string }> | undefined,
  res: import("express").Response,
  lang?: SupportedLang
): Promise<void> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const courseCtx = assembleCourseWideContext(courseId);

  const prompt = `${getLangDirective(lang)}
=== YOUR ROLE ===
You are an EXPERT AI TUTOR for: ${course.code} - ${course.name}.

=== COURSE CONTEXT ===
${courseCtx.fullContext}

=== STUDENT MESSAGE ===
${message}

Answer directly, reference specific lessons, end with 3 suggested follow-up questions in this format:
**Suggested Questions:**
1. ...
2. ...
3. ...
`;

  const startMs = Date.now();
  const modelName = "gemini-2.5-flash";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientDisconnected = false;
  res.on("close", () => { clientDisconnected = true; });

  let streamResult;
  try {
    streamResult = await withAiResilience(
      async (signal) => {
        const chat = getModel().startChat({
          history: history?.map((h) => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          })) || [],
          generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
        });
        return chat.sendMessageStream(prompt, { signal });
      },
      { timeoutMs: 30_000, label: "course_chat_stream", breakerKey: "gemini-2.5-flash" }
    );
  } catch (err) {
    trackStreamUsage("course_chat_stream", modelName, startMs, undefined, false);
    if (!clientDisconnected) {
      const msg = err instanceof Error ? err.message : "AI service unavailable";
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
      res.end();
    }
    return;
  }

  let fullText = "";
  let streamSucceeded = true;
  try {
    for await (const chunk of streamResult.stream) {
      if (clientDisconnected) break;
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        try {
          res.write(`data: ${JSON.stringify({ type: "chunk", text: chunkText })}\n\n`);
        } catch {
          clientDisconnected = true;
          break;
        }
      }
    }
  } catch (streamErr) {
    streamSucceeded = false;
    logger.warn({ err: streamErr instanceof Error ? streamErr.message : String(streamErr) }, "Course chat stream interrupted");
    if (!fullText && !clientDisconnected) {
      trackStreamUsage("course_chat_stream", modelName, startMs, undefined, false);
      res.write(`data: ${JSON.stringify({ type: "error", message: "AI yanıt üretemedi, lütfen tekrar deneyin." })}\n\n`);
      res.end();
      return;
    }
  }

  // Read final usageMetadata after the stream drains
  try {
    const finalResponse = await streamResult.response;
    trackStreamUsage("course_chat_stream", modelName, startMs, finalResponse, streamSucceeded);
  } catch {
    trackStreamUsage("course_chat_stream", modelName, startMs, undefined, streamSucceeded);
  }

  if (!clientDisconnected) {
    // Extract suggestions from accumulated text
    const suggestionsMatch = fullText.match(/\*\*Suggested Questions:\*\*\s*([\s\S]*?)$/);
    const suggestions = suggestionsMatch
      ? suggestionsMatch[1].trim().split("\n").map((line) => line.replace(/^\d+\.\s*/, "").trim()).filter((s) => s.length > 5).slice(0, 3)
      : [];
    res.write(`data: ${JSON.stringify({ type: "done", suggestions })}\n\n`);
    res.end();
  }
}

export async function generateStudySchedule(
  courseId: string,
  examDate?: string
): Promise<{ courseId: string; generatedAt: string; examDate?: string; days: unknown[]; tips: unknown[] }> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const progress = getCourseProgress(courseId);
  const ki = course.knowledgeIndex;
  const effectiveExamDate = examDate || course.settings?.examDate || "Not specified";

  const prompt = `Generate a personalized weekly study schedule in JSON format.
Course: ${course.code} - ${course.name}
Total Lessons: ${progress?.totalLessons || 0}, Completed: ${progress?.completedLessons || 0}
Quiz Average: ${progress?.overallQuizAvg ? Math.round(progress.overallQuizAvg * 100) + '%' : 'N/A'}
Weak Topics: ${progress?.weakTopics?.join(', ') || 'None'}
Exam Date: ${effectiveExamDate}
${ki ? `Themes: ${ki.overview.courseThemes.join(', ')}` : ''}

Return JSON: { "days": [{ "day": "Monday", "slots": [{ "time": "Morning", "activity": "..." }] }], "tips": ["..."] }`;

  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 2000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.STUDY_SCHEDULE as import("@google/generative-ai").ResponseSchema,
    },
  }, { label: "study_schedule", timeoutMs: 30_000 });

  const text = result.response.text();
  logger.info(`[AI] STUDY_SCHEDULE | courseId=${courseId} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(text.length / 4)} out`);
  const parsed = tryParseJSON(text) ?? tryParseJSON(stripCodeFences(text));
  if (!parsed) throw new AppError(500, "AI response parse error", "LLM_PARSE_ERROR");

  return {
    courseId,
    generatedAt: new Date().toISOString(),
    examDate: effectiveExamDate !== "Not specified" ? effectiveExamDate : undefined,
    days: parsed.days || [],
    tips: parsed.tips || [],
  };
}
