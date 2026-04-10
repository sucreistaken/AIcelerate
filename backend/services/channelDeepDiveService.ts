import { logger } from "../utils/logger";
import {
  channelToolRepo,
  DeepDiveMessage,
} from "../repositories/channelToolRepo";
import { safeGenerate, getTemperature } from "./aiService";
import { channelService } from "./channelService";
import { getLesson } from "../controllers/lessonControllers";
import { generateId } from "../utils/idGenerator";
import { buildToolContext } from "./channelContextBuilder";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";

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
        const traps = lesson.loModules.modules.flatMap((m: any) => m.commonTraps || []);
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

    const prompt = `${getLangDirective(lang)}\n\nYou are a study assistant for '${serverName}' helping with '${topic}'.${lessonBlock} Answer clearly and educationally. Previous conversation: ${context}\n\nStudent ${nickname} asks: ${text}`;

    const result = await safeGenerate({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2500, temperature: getTemperature("creative") },
    }, { label: "channel_deep_dive", timeoutMs: 45_000 });
    const aiText = result.response.text();
    logger.info(`[AI] CHANNEL_DEEP_DIVE | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(aiText.length / 4)} out | max=2500`);

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

    return { userMessage, aiMessage };
  } catch (err) {
    logger.error("channelToolService.deepDiveChat error:", err);
    throw new Error("Failed to generate AI response");
  }
}
