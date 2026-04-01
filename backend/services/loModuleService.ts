import { logger } from "../utils/logger";
import { getModel, stripCodeFences, tryParseJSON, getTemperature } from "./aiService";
import { LoLink, LoAlignedSegment, LoAlignment } from "../types";
import { smartTruncate } from "../utils/smartTruncate";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";
import { getLesson, upsertLesson } from "../controllers/lessonControllers";
import { notFound, badRequest, AppError } from "../middleware/errorHandler";
import { SCHEMAS } from "../prompts/schemas";

export function buildCondensedContext(lesson: any): { lecContext: string; sldContext: string } {
  const plan = lesson.plan;
  if (!plan) {
    return {
      lecContext: smartTruncate(lesson.transcript || "", 18000),
      sldContext: smartTruncate(lesson.slideText || "", 18000),
    };
  }
  const parts: string[] = [];
  if (plan.topic) parts.push(`Topic: ${plan.topic}`);
  if (plan.key_concepts?.length) parts.push(`Key concepts: ${plan.key_concepts.join(", ")}`);
  if (plan.modules?.length) {
    const modSummary = plan.modules.slice(0, 6).map((m: any) => `- ${m.title || "Module"}: ${m.goal || ""}`).join("\n");
    parts.push(`Modules:\n${modSummary}`);
  }
  if (plan.emphases?.length) {
    const emphSummary = plan.emphases.slice(0, 8).map((e: any) => `- ${e.statement}${e.why ? ` (${e.why})` : ""}`).join("\n");
    parts.push(`Professor emphases:\n${emphSummary}`);
  }
  const condensedPlan = parts.join("\n\n");
  const transcriptExcerpt = smartTruncate(lesson.transcript || "", 4000);
  const lecContext = `${condensedPlan}\n\n--- Transcript excerpt ---\n${transcriptExcerpt}`;
  const sldContext = smartTruncate(lesson.slideText || "", 4000);
  return { lecContext, sldContext };
}

export function segmentTranscript(lectureText: string): { index: number; text: string }[] {
  const raw = (lectureText || "").replace(/\r\n/g, "\n");
  let parts = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return [{ index: 0, text: raw.trim() }];
  const MAX_SEGMENTS = 40;
  if (parts.length > MAX_SEGMENTS) {
    const chunkSize = Math.ceil(parts.length / MAX_SEGMENTS);
    const merged: string[] = [];
    for (let i = 0; i < parts.length; i += chunkSize) {
      merged.push(parts.slice(i, i + chunkSize).join("\n\n"));
    }
    parts = merged;
  }
  return parts.map((text, index) => ({ index, text }));
}

export const hasAlignment = (plan: any) =>
  !!plan?.alignment?.items?.length &&
  Number.isFinite(plan?.alignment?.average_duration_min ?? NaN);

export function buildLoModulesPrompt(input: {
  transcript: string; slideText: string; learningOutcomes: string[];
  loAlignment?: LoAlignment; plan?: any; lang?: SupportedLang;
}): string {
  const LEC = smartTruncate(input.transcript, 16000);
  const SLD = smartTruncate(input.slideText, 8000);
  const LO_LIST = input.learningOutcomes.map((lo, i) => `LO${i + 1}: ${lo}`).join("\n");
  const ALIGN_SNIPPET = input.loAlignment ? JSON.stringify(input.loAlignment).slice(0, 8000) : "—";
  const PLAN_SNIPPET = input.plan ? JSON.stringify(input.plan).slice(0, 6000) : "—";

  return `
You are an expert learning designer and exam coach.

${getLangDirective(input.lang)}

GOAL:
Transform the raw transcript and slides into SMALL, HIGH-RECALL learning modules,
each tightly linked to ONE official Learning Outcome (LO).

CRITICAL ALIGNMENT RULES:
1. **STRICT EVIDENCE CHECK**: Only generate content for an LO if there is clear evidence in the Transcript (LEC) or Slides (SLIDE).
2. **NO HALLUCINATIONS**: If an LO is NOT covered, state that in "oneLineGist" and keep other fields minimal.
3. **SOURCE PRIORITY**: Prioritize Transcript over Slides.

[LEARNING OUTCOMES]
${LO_LIST}

[LO_ALIGNMENT (optional)]
${ALIGN_SNIPPET}

[PLAN & EMPHASES (optional)]
${PLAN_SNIPPET}

[TRANSCRIPT - LEC]
${LEC}

[SLIDE]
${SLD}

OUTPUT:
Return ONLY VALID JSON with schema:
{
  "modules": [
    {
      "loId": "LO1", "loTitle": "string", "oneLineGist": "string",
      "coreIdeas": ["string"], "mustRemember": ["string"],
      "intuitiveExplanation": "string",
      "examples": [{ "label": "string", "description": "string" }],
      "typicalQuestions": ["string"], "commonTraps": ["string"],
      "miniQuiz": [{ "question": "string", "answer": "string", "why": "string" }],
      "recommended_study_time_min": number
    }
  ]
}

RULES:
- One module per LO. Use the same LO ids.
- "coreIdeas" 3–6 bullet points.
- "mustRemember" 3–5 key facts.
- "intuitiveExplanation" max 6–7 sentences.
- "miniQuiz" 2–4 items per LO.
- DO NOT output any text outside the JSON.
`.trim();
}

export async function generateLoAlignmentForLesson(
  lectureText: string, slidesText: string, learningOutcomes: string[],
  lang?: SupportedLang
): Promise<LoAlignment> {
  const model = getModel();
  const baseSegments = segmentTranscript(lectureText);
  if (!baseSegments.length) throw new Error("Transcript is empty; cannot generate alignment.");
  const LOs = (learningOutcomes || []).map((t) => String(t || "").trim()).filter(Boolean);
  if (!LOs.length) throw new Error("Learning Outcomes list is empty.");
  const LO_LIST = LOs.map((lo, i) => `LO${i + 1}: ${lo}`).join("\n");
  const SEGMENTS_JSON = smartTruncate(JSON.stringify(baseSegments.map((s) => ({ index: s.index, text: s.text }))), 12000);
  const SLD = smartTruncate(slidesText || "", 4000);

  const prompt = `
You are an instructional designer. Below you see the official Learning Outcomes and pre-segmented transcript blocks.

${getLangDirective(lang)}

Task: For each transcript segment, link it to 0–3 LOs.

OUTPUT SCHEMA (STRICT):
{
  "segments": [
    { "index": number, "lo_links": [{ "lo_id": "LO1", "lo_title": "string", "confidence": number }] }
  ]
}

RULES:
- Do NOT change segment "index" values.
- "confidence" is 0–1.
- Output ONLY valid JSON.

[LEARNING_OUTCOMES]
${LO_LIST}

[SEGMENTS]
${SEGMENTS_JSON}

[SLIDE_HINTS (optional)]
${SLD || "—"}
`.trim();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: getTemperature("structured"), responseMimeType: "application/json", responseSchema: SCHEMAS.LO_ALIGNMENT } as any,
  });
  const parsed = JSON.parse(result.response.text());
  if (!parsed?.segments || !Array.isArray(parsed.segments)) throw new Error("LO alignment JSON parse/schema error");

  const linksByIndex = new Map<number, LoLink[]>();
  for (const item of parsed.segments) {
    if (typeof item?.index !== "number" || !Array.isArray(item?.lo_links)) continue;
    const links: LoLink[] = [];
    for (const l of item.lo_links) {
      if (!l) continue;
      const lo_id = String(l.lo_id || "").trim();
      const lo_title = String(l.lo_title || "").trim();
      const conf = Number(l.confidence);
      if (!lo_id || !lo_title || !Number.isFinite(conf)) continue;
      links.push({ lo_id, lo_title, confidence: Math.max(0, Math.min(1, conf)) });
    }
    linksByIndex.set(item.index, links);
  }

  const segments: LoAlignedSegment[] = baseSegments.map((seg) => ({
    index: seg.index, text: seg.text, lo_links: linksByIndex.get(seg.index) || [],
  }));
  return { segments };
}

export async function generateLoModules(
  lessonId: string,
  forceRegen: boolean = false,
  lang?: SupportedLang
): Promise<{ modules: any[]; cached: boolean }> {
  const lesson = getLesson(lessonId);
  if (!lesson) throw notFound("Lesson not found");

  if (!forceRegen && lesson.loModules?.modules?.length) {
    return { modules: lesson.loModules.modules, cached: true };
  }
  if (!lesson.transcript || !lesson.learningOutcomes?.length) {
    throw badRequest("Transcript and Learning Outcomes are required.");
  }

  const prompt = buildLoModulesPrompt({
    transcript: lesson.transcript, slideText: lesson.slideText || "",
    learningOutcomes: lesson.learningOutcomes!, loAlignment: lesson.loAlignment, plan: lesson.plan, lang,
  });
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 6000, temperature: getTemperature("balanced"), responseMimeType: "application/json", responseSchema: SCHEMAS.LO_MODULES } as any,
  });
  const j = JSON.parse(result.response.text());
  if (!j?.modules || !Array.isArray(j.modules)) {
    throw new AppError(500, "LO modules JSON/schema error", "LLM_PARSE_ERROR");
  }

  const loModules = { lessonId, modules: j.modules };
  upsertLesson({ id: lessonId, loModules });
  logger.info(`[AI] LO_MODULES | lessonId=${lessonId}`);
  return { modules: loModules.modules, cached: false };
}

export async function generateAlignmentOnly(lectureText: string, slidesText: string, lang?: SupportedLang) {
  const model = getModel();
  const LEC = smartTruncate(lectureText, 18000);
  const SLD = smartTruncate(slidesText, 18000);

  const prompt = `
Compare the two texts and return ONLY the following JSON, nothing else.

SCHEMA:
{
  "summary_chatty": "string",
  "average_duration_min": number,
  "items": [
    {
      "topic": "string", "concepts": string[], "in_both": boolean,
      "emphasis_level": "high"|"medium"|"low",
      "lecture_quotes": string[], "slide_refs": string[],
      "duration_min": number, "confidence": number
    }
  ]
}

RULES:
- "items" must contain at least 5 entries.
- Output ONLY valid JSON.

[LEC]
${LEC}

[SLIDE]
${SLD}
`.trim();

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4000, temperature: getTemperature("structured"), responseMimeType: "application/json", responseSchema: SCHEMAS.PLAN_ALIGNMENT } as any,
  });
  const j = JSON.parse(result.response.text());
  if (!j) throw new Error("Alignment JSON parse error");
  return j;
}
