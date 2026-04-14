import { logger } from "../utils/logger";
import {
  channelToolRepo,
  DeepDiveMessage,
} from "../repositories/channelToolRepo";
import { safeGenerate, getTemperature, getModel, trackStreamUsage } from "./aiService";
import { channelService } from "./channelService";
import { getLesson } from "./lessonDataService";
import { generateId } from "../utils/idGenerator";
import { buildToolContext } from "./contextAssemblerService";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
import { sanitizeForPrompt, sanitizeNickname } from "../utils/sanitize";
import { serviceUnavailable, AppError } from "../middleware/errorHandler";
import { eventBus } from "../events/eventBus";
import { withAiResilience } from "../utils/aiResilience";

// ── Deep Dive: chat ─────────────────────────────────────────────────────────
export async function deepDiveChat(
  channelId: string,
  text: string,
  userId: string,
  nickname: string,
  topic: string,
  serverName: string,
  lang?: SupportedLang
): Promise<{ userMessage: DeepDiveMessage; aiMessage: DeepDiveMessage }> {
  const data = await channelToolRepo.load(channelId);

  if (!data.deepDive) {
    data.deepDive = { messages: [] };
  }

  // Add user message
  const userMessage: DeepDiveMessage = {
    id: generateId(),
    role: "user",
    text,
    authorId: userId,
    authorNickname: nickname,
    timestamp: new Date().toISOString(),
  };
  data.deepDive.messages.push(userMessage);

  // Build context from recent messages
  const recentMessages = data.deepDive.messages.slice(-20);
  const context = recentMessages
    .map((m) => `${m.authorNickname} (${m.role}): ${m.text}`)
    .join("\n");

  try {
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "thinking", actorId: userId });
    const toolCtx = await buildToolContext(channelId, "deep-dive");

    let lessonBlock = '';
    if (toolCtx) {
      const extraInstructions: string[] = [];

      // Extract pitfalls for warning
      const lesson = getLesson((await channelService.getByIdGlobal(channelId)).lessonId!);
      if (lesson?.cheatSheet?.pitfalls?.length) {
        extraInstructions.push(`Common mistakes to warn about:\n${lesson.cheatSheet.pitfalls.map((p: string) => `- ${p}`).join("\n")}`);
      }
      if (lesson?.loModules?.modules) {
        const traps = lesson.loModules.modules.flatMap((m: { commonTraps?: string[] }) => m.commonTraps || []);
        if (traps.length > 0) {
          extraInstructions.push(`Student misconceptions:\n${traps.map((t: string) => `- ${t}`).join("\n")}`);
        }
      }
      if (lesson?.cheatSheet?.formulas?.length) {
        extraInstructions.push(`Key formulas to reference:\n${lesson.cheatSheet.formulas.map((f: string) => `- ${f}`).join("\n")}`);
      }

      lessonBlock = `\n\nYou have access to the following lecture material. Use it to give accurate, specific answers:\n\n${toolCtx.context}`;
      if (extraInstructions.length > 0) {
        lessonBlock += `\n\n=== SPECIAL INSTRUCTIONS ===\n${extraInstructions.join("\n\n")}`;
      }
      lessonBlock += '\n\n';
    }

    const prompt = `${getLangDirective(lang)}\n\nYou are a study assistant for '${serverName}' helping with '${topic}'.${lessonBlock} Answer clearly and educationally. Previous conversation: ${context}\n\nStudent ${sanitizeNickname(nickname)} asks: ${sanitizeForPrompt(text)}`;

    const result = await safeGenerate({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
    }, { label: "channel_deep_dive", timeoutMs: 45_000 });
    const aiText = (result.response.text() || "").trim();
    logger.info(`[AI] CHANNEL_DEEP_DIVE | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(aiText.length / 4)} out | max=2500`);

    // Guard: don't save empty AI responses (can happen on Gemini safety filter / parse fail)
    if (!aiText) {
      await channelToolRepo.save(channelId, data);
      const fallbackAi: DeepDiveMessage = {
        id: generateId(),
        role: "assistant",
        text: lang === "tr" ? "Üzgünüm, bu soruya yanıt üretemedi. Lütfen tekrar deneyin." : "Sorry, could not generate a response. Please try again.",
        authorId: "ai",
        authorNickname: "Study AI",
        timestamp: new Date().toISOString(),
      };
      data.deepDive.messages.push(fallbackAi);
      await channelToolRepo.save(channelId, data);
      return { userMessage, aiMessage: fallbackAi };
    }

    const aiMessage: DeepDiveMessage = {
      id: generateId(),
      role: "assistant",
      text: aiText,
      authorId: "ai",
      authorNickname: "Study AI",
      timestamp: new Date().toISOString(),
    };
    data.deepDive.messages.push(aiMessage);

    await channelToolRepo.save(channelId, data);

    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "complete", actorId: userId });
    return { userMessage, aiMessage };
  } catch (err) {
    logger.error("channelToolService.deepDiveChat error:", err);
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "error", actorId: userId });
    if (err instanceof AppError) throw err;  // preserve typed AI errors (timeout, circuit, safety)
    throw serviceUnavailable("Failed to generate AI response");
  }
}

// ── Deep Dive: streaming chat ───────────────────────────────────────────────
/**
 * Streaming variant of deepDiveChat — pipes Gemini chunks to SSE response.
 * Persists the user message and (once complete) the full AI message back to the repo.
 * Emits Socket.IO `ai:status` events (thinking/complete/error) for the channel.
 */
export async function deepDiveChatStream(
  channelId: string,
  text: string,
  userId: string,
  nickname: string,
  topic: string,
  serverName: string,
  res: import("express").Response,
  lang?: SupportedLang
): Promise<void> {
  const startMs = Date.now();
  const modelName = "gemini-2.5-flash";

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  let clientDisconnected = false;
  res.on("close", () => { clientDisconnected = true; });

  // ── Load state and append user message up-front ───────────────────────────
  const data = await channelToolRepo.load(channelId);
  if (!data.deepDive) {
    data.deepDive = { messages: [] };
  }

  const userMessage: DeepDiveMessage = {
    id: generateId(),
    role: "user",
    text,
    authorId: userId,
    authorNickname: nickname,
    timestamp: new Date().toISOString(),
  };
  data.deepDive.messages.push(userMessage);

  // Build context from recent messages (includes the just-pushed user message)
  const recentMessages = data.deepDive.messages.slice(-20);
  const context = recentMessages
    .map((m) => `${m.authorNickname} (${m.role}): ${m.text}`)
    .join("\n");

  // ── Build prompt (same shape as non-streaming variant) ────────────────────
  let prompt: string;
  try {
    const toolCtx = await buildToolContext(channelId, "deep-dive");

    let lessonBlock = "";
    if (toolCtx) {
      const extraInstructions: string[] = [];
      const lesson = getLesson((await channelService.getByIdGlobal(channelId)).lessonId!);
      if (lesson?.cheatSheet?.pitfalls?.length) {
        extraInstructions.push(`Common mistakes to warn about:\n${lesson.cheatSheet.pitfalls.map((p: string) => `- ${p}`).join("\n")}`);
      }
      if (lesson?.loModules?.modules) {
        const traps = lesson.loModules.modules.flatMap((m: { commonTraps?: string[] }) => m.commonTraps || []);
        if (traps.length > 0) {
          extraInstructions.push(`Student misconceptions:\n${traps.map((t: string) => `- ${t}`).join("\n")}`);
        }
      }
      if (lesson?.cheatSheet?.formulas?.length) {
        extraInstructions.push(`Key formulas to reference:\n${lesson.cheatSheet.formulas.map((f: string) => `- ${f}`).join("\n")}`);
      }

      lessonBlock = `\n\nYou have access to the following lecture material. Use it to give accurate, specific answers:\n\n${toolCtx.context}`;
      if (extraInstructions.length > 0) {
        lessonBlock += `\n\n=== SPECIAL INSTRUCTIONS ===\n${extraInstructions.join("\n\n")}`;
      }
      lessonBlock += "\n\n";
    }

    prompt = `${getLangDirective(lang)}\n\nYou are a study assistant for '${serverName}' helping with '${topic}'.${lessonBlock} Answer clearly and educationally. Previous conversation: ${context}\n\nStudent ${sanitizeNickname(nickname)} asks: ${sanitizeForPrompt(text)}`;
  } catch (err) {
    logger.error("channelDeepDiveService.deepDiveChatStream prompt build error:", err);
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "error", actorId: userId });
    if (!clientDisconnected) {
      const msg = err instanceof Error ? err.message : "Failed to prepare AI context";
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
      res.end();
    }
    return;
  }

  // ── Announce "thinking" once the prompt is ready ─────────────────────────
  eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "thinking", actorId: userId });

  // ── Start the streaming call ─────────────────────────────────────────────
  let streamResult;
  try {
    streamResult = await withAiResilience(
      async (signal) => {
        const chat = getModel().startChat({
          generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
        });
        return chat.sendMessageStream(prompt, { signal });
      },
      { timeoutMs: 45_000, label: "channel_deep_dive_stream", breakerKey: "gemini-2.5-flash" }
    );
  } catch (err) {
    trackStreamUsage("channel_deep_dive_stream", modelName, startMs, undefined, false);
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "error", actorId: userId });
    if (!clientDisconnected) {
      const msg = err instanceof Error ? err.message : "AI service unavailable";
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
      res.end();
    }
    return;
  }

  // ── Stream chunks to the client ───────────────────────────────────────────
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
    logger.warn({ err: streamErr instanceof Error ? streamErr.message : String(streamErr) }, "Deep dive stream interrupted");
    if (!fullText && !clientDisconnected) {
      trackStreamUsage("channel_deep_dive_stream", modelName, startMs, undefined, false);
      eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "error", actorId: userId });
      res.write(`data: ${JSON.stringify({ type: "error", message: lang === "tr" ? "AI yanıt üretemedi, lütfen tekrar deneyin." : "AI failed to respond, please try again." })}\n\n`);
      res.end();
      return;
    }
  }

  // ── Read final usageMetadata after the stream drains ──────────────────────
  try {
    const finalResponse = await streamResult.response;
    trackStreamUsage("channel_deep_dive_stream", modelName, startMs, finalResponse, streamSucceeded);
  } catch {
    trackStreamUsage("channel_deep_dive_stream", modelName, startMs, undefined, streamSucceeded);
  }

  // ── Persist the AI message (use trimmed fullText; fall back on empty) ─────
  const finalText = fullText.trim();
  const aiMessage: DeepDiveMessage = finalText
    ? {
        id: generateId(),
        role: "assistant",
        text: finalText,
        authorId: "ai",
        authorNickname: "Study AI",
        timestamp: new Date().toISOString(),
      }
    : {
        id: generateId(),
        role: "assistant",
        text: lang === "tr" ? "Üzgünüm, bu soruya yanıt üretemedi. Lütfen tekrar deneyin." : "Sorry, could not generate a response. Please try again.",
        authorId: "ai",
        authorNickname: "Study AI",
        timestamp: new Date().toISOString(),
      };
  data.deepDive.messages.push(aiMessage);

  try {
    await channelToolRepo.save(channelId, data);
  } catch (saveErr) {
    logger.error("channelDeepDiveService.deepDiveChatStream save error:", saveErr);
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "error", actorId: userId });
    if (!clientDisconnected) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Failed to persist AI message" })}\n\n`);
      res.end();
    }
    return;
  }

  logger.info(`[AI] CHANNEL_DEEP_DIVE_STREAM | channelId=${channelId} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(finalText.length / 4)} out`);

  // ── Final success event ──────────────────────────────────────────────────
  if (!clientDisconnected) {
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "complete", actorId: userId });
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        userMessageId: userMessage.id,
        aiMessageId: aiMessage.id,
      })}\n\n`
    );
    res.end();
  } else {
    // Client already gone but the write succeeded on our side — still broadcast complete.
    eventBus.emit("ai:status", { channelId, tool: "deep-dive", state: "complete", actorId: userId });
  }
}
