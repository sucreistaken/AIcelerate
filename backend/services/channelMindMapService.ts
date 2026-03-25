import { logger } from "../utils/logger";
import { channelToolRepo } from "../repositories/channelToolRepo";
import { getModel, stripCodeFences } from "./aiService";
import { channelService } from "./channelService";
import { getLesson } from "../controllers/lessonControllers";
import { buildToolContext } from "./channelContextBuilder";

// ── Mind Map: generate ──────────────────────────────────────────────────────
export async function generateMindMap(
  channelId: string,
  topic: string,
  serverName: string
) {
  const data = channelToolRepo.load(channelId);

  try {
    const toolCtx = await buildToolContext(channelId, "mind-map");

    let contextBlock = '';
    if (toolCtx) {
      const lesson = getLesson((await channelService.getByIdGlobal(channelId)).lessonId!);
      const structureHints: string[] = [];
      if (lesson?.plan?.modules?.length) {
        structureHints.push(`Use these as main branches: ${lesson.plan.modules.map((m: any) => m.title).join(", ")}`);
      }
      if (lesson?.plan?.key_concepts?.length) {
        structureHints.push(`Connecting themes: ${lesson.plan.key_concepts.join(", ")}`);
      }
      contextBlock = `Based on the following lecture material, create a mind map that reflects the actual content structure:\n\n${toolCtx.context}\n\n`;
      if (structureHints.length > 0) {
        contextBlock += `STRUCTURE HINTS:\n${structureHints.join("\n")}\n\n`;
      }
    }

    const prompt = `${contextBlock}Create a Mermaid.js mindmap diagram about '${topic}' for study group '${serverName}'. Use \`mindmap\` syntax. Return ONLY the Mermaid code, no markdown fences.`;

    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1500 },
    });
    const rawText = result.response.text();
    logger.info(`[AI] CHANNEL_MINDMAP | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(rawText.length / 4)} out | max=1500`);
    const mermaidCode = stripCodeFences(rawText);

    data.mindMap = {
      mermaidCode,
      generatedAt: new Date().toISOString(),
      topic,
    };

    channelToolRepo.save(channelId, data);

    return { mindMap: data.mindMap, sourcesSummary: toolCtx?.meta.sourcesSummary || null };
  } catch (err) {
    logger.error("channelToolService.generateMindMap error:", err);
    throw new Error("Failed to generate mind map");
  }
}
