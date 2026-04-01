import { logger } from "../utils/logger";
import { getModel, stripCodeFences, tryParseJSON, getTemperature } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import {
  buildMindmapPrompt,
  buildMindmapModulePrompt,
  buildMindmapNodeDetailPrompt,
} from "../prompts/lessonPrompts";
import { assembleCourseContext } from "../controllers/contextAssembler";
import type { Lesson } from "../controllers/lessonControllers";
import type { NodeDetailResult, PlanModule, PlanEmphasis } from "../types";
import type { SupportedLang } from "../utils/langDirective";

function logAI(label: string, inputLen: number, outputLen: number, maxTokens: number) {
  logger.info(`[AI] ${label} | ~${Math.ceil(inputLen / 4)} in, ~${Math.ceil(outputLen / 4)} out | max=${maxTokens}`);
}

export async function generateMindmap(lesson: Lesson, lessonId: string, lang?: SupportedLang): Promise<string> {
  const plan = lesson.plan;
  const title = lesson.title || plan?.title || "Lesson Topic";
  const modules = plan?.modules || [];
  const emphases = lesson.professorEmphases || plan?.emphases || [];
  const highlights = lesson.highlights || [];
  const transcript = (lesson.transcript || "").substring(0, 2000);
  const slides = (lesson.slideText || "").substring(0, 1500);
  const mindmapCourseCtx = assembleCourseContext(lessonId, "mindmap");
  const moduleNames = modules.slice(0, 4).map((m: PlanModule) => m.title || m.name || "Module");
  const keyPoints = emphases.slice(0, 6).map((e: PlanEmphasis) => e.statement || String(e)).filter(Boolean);
  const concepts = highlights.slice(0, 8);

  const prompt = buildMindmapPrompt(title, moduleNames, keyPoints, concepts, transcript, slides, mindmapCourseCtx.crossLessonBlock, lang);

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1500, temperature: getTemperature("balanced") },
  });

  return cleanMindmapCode(result.response.text(), title);
}

export async function generateMindmapModule(
  lesson: Lesson, moduleIndex: number, lang?: SupportedLang
): Promise<{ code: string; moduleTitle: string }> {
  const plan = lesson.plan;
  const modules = plan?.modules || [];
  const lessonTitle = lesson.title || plan?.title || "Lesson Topic";
  let targetTitle: string;
  let targetContent: string;

  if (moduleIndex === -1) {
    targetTitle = lessonTitle;
    targetContent = modules.slice(0, 4).map((m: PlanModule) => {
      const title = m.title || m.name || "Module";
      const topics = (m.topics || m.content || []).slice(0, 3).map(t => typeof t === 'string' ? t : (t.title || '')).join(", ");
      return `${title}: ${topics}`;
    }).join("\n");
  } else {
    const targetModule = modules[moduleIndex];
    if (!targetModule) throw new Error("Module not found");
    targetTitle = targetModule.title || targetModule.name || `Module ${moduleIndex + 1}`;
    const topics = targetModule.topics || targetModule.content || [];
    targetContent = topics.map(t => typeof t === 'string' ? t : (t.title || t.name || t.description || '')).join("\n");
  }

  const prompt = buildMindmapModulePrompt(targetTitle, targetContent, lang);
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1200, temperature: getTemperature("balanced") },
  });

  const code = cleanMindmapCode(result.response.text(), targetTitle);
  return { code, moduleTitle: targetTitle };
}

export async function generateMindmapNodeDetail(
  lesson: Lesson, nodeName: string, action: "explain" | "example" | "quiz" | "all", lang?: SupportedLang
): Promise<NodeDetailResult> {
  const transcript = (lesson.transcript || "").substring(0, 3000);
  const lessonTitle = lesson.title || "Lesson";

  const prompt = buildMindmapNodeDetailPrompt(nodeName, lessonTitle, transcript, action, lang);
  const maxTokens = action === "all" ? 1500 : 800;
  const schema = action === "all" ? SCHEMAS.MINDMAP_NODE_ALL : null;

  const genConfig: import("@google/generative-ai").GenerationConfig = { maxOutputTokens: maxTokens, temperature: getTemperature("balanced") };
  if (schema) {
    genConfig.responseMimeType = "application/json";
    genConfig.responseSchema = schema as import("@google/generative-ai").ResponseSchema;
  }
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: genConfig,
  });
  let responseText = result.response.text();
  if (!schema) responseText = responseText.replace(/```json?/gi, "").replace(/```/g, "").trim();
  logAI("MINDMAP_NODE_DETAIL", prompt.length, responseText.length, maxTokens);

  const parsed = tryParseJSON(responseText);
  if (!parsed) throw new Error("Failed to parse AI response");
  return { action, ...parsed };
}

function cleanMindmapCode(rawText: string, title: string): string {
  let code = rawText.replace(/```mermaid/gi, "").replace(/```/g, "").replace(/\r\n/g, "\n").trim();
  const lines = code.split("\n");
  const cleanLines: string[] = [];
  for (const line of lines) {
    let processedLine = line;
    const trimmed = line.trim();
    if (!trimmed && cleanLines.length < 2) continue;
    if (trimmed.includes('```')) continue;
    if (/^[:\-\[\]\(\)\{\}]+$/.test(trimmed)) continue;
    if (!trimmed.startsWith('mindmap') && !trimmed.startsWith('root((')) {
      processedLine = processedLine.replace(/[:\[\]\{\}`"]/g, "");
      if (!processedLine.includes('root((')) processedLine = processedLine.replace(/\(/g, "").replace(/\)/g, "");
      if (processedLine.trim().length > 50) {
        const indent = processedLine.match(/^\s*/)?.[0] || "";
        processedLine = indent + processedLine.trim().substring(0, 50);
      }
    }
    if (processedLine.trim()) cleanLines.push(processedLine);
  }
  if (!cleanLines[0]?.trim().startsWith('mindmap')) cleanLines.unshift('mindmap');
  const hasRoot = cleanLines.some(l => l.includes('root(('));
  if (!hasRoot && cleanLines.length > 1) {
    cleanLines.splice(1, 0, '  root((' + (title || 'Topic').substring(0, 15) + '))');
  }
  return cleanLines.join("\n");
}
