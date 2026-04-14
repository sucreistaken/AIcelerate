import { logger } from "../utils/logger";
import { safeGenerate, getTemperature, getModel, trackStreamUsage } from "./aiService";
import { listLessons } from "./lessonDataService";
import { badRequest } from "../middleware/errorHandler";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
import { withAiResilience } from "../utils/aiResilience";

export async function generateConnectionDeepDive(
  concept: string,
  lessonTitles: string[],
  relatedConcepts: string[],
  lang?: SupportedLang
): Promise<string> {
  if (!concept) throw badRequest("concept is required");

  const allLessons = listLessons();
  const relevantLessons = allLessons.filter((l) =>
    lessonTitles.some((t) => l.title === t)
  );

  const lessonContext = relevantLessons
    .map((l) => {
      const keyConcepts = l.plan?.key_concepts?.join(", ") || "N/A";
      const emphases = (l.plan?.emphases || l.professorEmphases || [])
        .map((e: { statement: string }) => e.statement)
        .filter(Boolean)
        .slice(0, 5)
        .join("; ");
      return `Lesson "${l.title}": Key concepts: ${keyConcepts}. Emphases: ${emphases || "N/A"}.`;
    })
    .join("\n");

  const prompt = `${getLangDirective(lang)}\n\nYou are an expert educational AI tutor. Provide a detailed 3-5 paragraph analysis of how the concept "${concept}" evolves and connects across multiple lessons.

Context about the lessons:
${lessonContext}

Related concepts: ${relatedConcepts.join(", ") || "none"}

Your analysis should:
1. Explain what this concept means and why it is fundamental
2. Describe how it appears differently in each lesson and how the understanding deepens
3. Show connections to the related concepts listed
4. Provide practical study advice for mastering this cross-lesson concept

Write in a clear, educational tone. Use paragraphs, not bullet points.`;

  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("creative") },
  }, { label: "connection_deep_dive", timeoutMs: 30_000 });
  const analysis = result.response.text();
  logger.info(`[AI] CONNECTION_DEEP_DIVE | concept=${concept} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(analysis.length / 4)} out`);

  return analysis;
}

/**
 * Streaming variant of generateConnectionDeepDive — pipes Gemini chunks to SSE response.
 * Solo per-user feature (no Socket.IO broadcast).
 */
export async function generateConnectionDeepDiveStream(
  concept: string,
  lessonTitles: string[],
  relatedConcepts: string[],
  res: import("express").Response,
  lang?: SupportedLang
): Promise<void> {
  if (!concept) throw badRequest("concept is required");

  const allLessons = listLessons();
  const relevantLessons = allLessons.filter((l) =>
    lessonTitles.some((t) => l.title === t)
  );

  const lessonContext = relevantLessons
    .map((l) => {
      const keyConcepts = l.plan?.key_concepts?.join(", ") || "N/A";
      const emphases = (l.plan?.emphases || l.professorEmphases || [])
        .map((e: { statement: string }) => e.statement)
        .filter(Boolean)
        .slice(0, 5)
        .join("; ");
      return `Lesson "${l.title}": Key concepts: ${keyConcepts}. Emphases: ${emphases || "N/A"}.`;
    })
    .join("\n");

  const prompt = `${getLangDirective(lang)}\n\nYou are an expert educational AI tutor. Provide a detailed 3-5 paragraph analysis of how the concept "${concept}" evolves and connects across multiple lessons.

Context about the lessons:
${lessonContext}

Related concepts: ${relatedConcepts.join(", ") || "none"}

Your analysis should:
1. Explain what this concept means and why it is fundamental
2. Describe how it appears differently in each lesson and how the understanding deepens
3. Show connections to the related concepts listed
4. Provide practical study advice for mastering this cross-lesson concept

Write in a clear, educational tone. Use paragraphs, not bullet points.`;

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
          generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("creative") },
        });
        return chat.sendMessageStream(prompt, { signal });
      },
      { timeoutMs: 30_000, label: "connection_deep_dive_stream", breakerKey: "gemini-2.5-flash" }
    );
  } catch (err) {
    trackStreamUsage("connection_deep_dive_stream", modelName, startMs, undefined, false);
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
    logger.warn({ err: streamErr instanceof Error ? streamErr.message : String(streamErr) }, "Connection deep-dive stream interrupted");
    if (!fullText && !clientDisconnected) {
      trackStreamUsage("connection_deep_dive_stream", modelName, startMs, undefined, false);
      res.write(`data: ${JSON.stringify({ type: "error", message: lang === "tr" ? "AI yanıt üretemedi, lütfen tekrar deneyin." : "AI failed to respond, please try again." })}\n\n`);
      res.end();
      return;
    }
  }

  // Read final usageMetadata after the stream drains
  try {
    const finalResponse = await streamResult.response;
    trackStreamUsage("connection_deep_dive_stream", modelName, startMs, finalResponse, streamSucceeded);
  } catch {
    trackStreamUsage("connection_deep_dive_stream", modelName, startMs, undefined, streamSucceeded);
  }

  logger.info(`[AI] CONNECTION_DEEP_DIVE_STREAM | concept=${concept} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(fullText.length / 4)} out`);

  if (!clientDisconnected) {
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
}
