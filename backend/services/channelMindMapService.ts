import { logger } from "../utils/logger";
import { channelToolRepo } from "../repositories/channelToolRepo";
import { safeGenerate, stripCodeFences, getTemperature } from "./aiService";
import { channelService } from "./channelService";
import { getLesson } from "./lessonDataService";
import { buildToolContext } from "./contextAssemblerService";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
import { sanitizeForPrompt } from "../utils/sanitize";
import { serviceUnavailable } from "../middleware/errorHandler";

// ── Mind Map: generate ──────────────────────────────────────────────────────
export async function generateMindMap(
  channelId: string,
  topic: string,
  serverName: string,
  lang?: SupportedLang
) {
  const data = await channelToolRepo.load(channelId);

  try {
    const toolCtx = await buildToolContext(channelId, "mind-map");

    let contextBlock = '';
    if (toolCtx) {
      const lesson = getLesson((await channelService.getByIdGlobal(channelId)).lessonId!);
      const structureHints: string[] = [];
      if (lesson?.plan?.modules?.length) {
        structureHints.push(`Use these as main branches: ${lesson.plan.modules.map((m: { title: string }) => m.title).join(", ")}`);
      }
      if (lesson?.plan?.key_concepts?.length) {
        structureHints.push(`Connecting themes: ${lesson.plan.key_concepts.join(", ")}`);
      }
      contextBlock = `Based on the following lecture material, create a mind map that reflects the actual content structure:\n\n${toolCtx.context}\n\n`;
      if (structureHints.length > 0) {
        contextBlock += `STRUCTURE HINTS:\n${structureHints.join("\n")}\n\n`;
      }
    }

    const prompt = `${getLangDirective(lang)}\n\n${contextBlock}Create a Mermaid.js mindmap diagram about '${sanitizeForPrompt(topic)}' for study group '${sanitizeForPrompt(serverName)}'. Use \`mindmap\` syntax. Return ONLY the Mermaid code, no markdown fences.`;

    const result = await safeGenerate({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1500, temperature: getTemperature("balanced") },
    }, { label: "channel_mindmap", timeoutMs: 30_000 });
    const rawText = result.response.text();
    logger.info(`[AI] CHANNEL_MINDMAP | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(rawText.length / 4)} out | max=1500`);
    const mermaidCode = stripCodeFences(rawText);

    data.mindMap = {
      mermaidCode,
      generatedAt: new Date().toISOString(),
      topic,
    };

    await channelToolRepo.save(channelId, data);

    return { mindMap: data.mindMap, sourcesSummary: toolCtx?.meta.sourcesSummary || null };
  } catch (err) {
    logger.error("channelToolService.generateMindMap error:", err);
    throw serviceUnavailable("Failed to generate mind map");
  }
}
