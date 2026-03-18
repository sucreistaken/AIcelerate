import { logger } from "../utils/logger";
// services/lessonDigestService.ts
// Generates and caches a compact lesson digest to replace full transcript+slides in AI calls.
// Typical digest: ~4,200 chars (~1,050 tokens) vs full context: ~36,000 chars (~9,000 tokens)

import { getModel, stripCodeFences, tryParseJSON } from "./aiService";
import { getLesson, upsertLesson } from "../controllers/lessonControllers";
import { SCHEMAS } from "../prompts/schemas";

export interface LessonDigest {
  lessonId: string;
  keyConcepts: string[];
  modulesSummary: string;
  transcriptDigest: string;
  slidesDigest: string;
  formulasAndDefinitions: string;
  generatedAt: string;
}

/**
 * Generate a compact digest from a lesson's full content.
 * Called after plan generation succeeds.
 */
export async function generateDigest(
  lessonId: string,
  lectureText: string,
  slidesText: string,
  plan: any
): Promise<LessonDigest> {
  const LEC = (lectureText || "").slice(0, 16000);
  const SLD = (slidesText || "").slice(0, 12000);

  // Extract what we can directly from the plan (no AI needed)
  const keyConcepts: string[] = plan?.key_concepts || [];
  const modules = plan?.modules || [];
  const emphases = plan?.emphases || [];

  const modulesSummary = modules
    .slice(0, 6)
    .map((m: any, i: number) => `${i + 1}. ${m.title || "Module"}: ${m.goal || ""}`)
    .join("\n");

  // Use AI to create compact digests of transcript and slides
  const prompt = `You are an educational content summarizer. Create ultra-compact summaries for later AI use.

[TRANSCRIPT]
${LEC}

[SLIDES]
${SLD}

[KEY CONCEPTS]
${keyConcepts.join(", ") || "N/A"}

[EMPHASES]
${emphases.slice(0, 8).map((e: any) => e.statement || e).join("; ") || "N/A"}

Return ONLY valid JSON:
{
  "transcriptDigest": "A 400-600 word summary of the transcript capturing all key facts, definitions, formulas, examples, and professor explanations. Include specific details that quiz questions might reference.",
  "slidesDigest": "A 200-300 word summary of the slides capturing structure, diagrams described, key terms, and visual information not in transcript.",
  "formulasAndDefinitions": "All formulas, equations, technical definitions, and precise terminology found in both sources. Format: term: definition or formula. Max 500 chars."
}`;

  try {
    const result = await getModel().generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
        responseSchema: SCHEMAS.LESSON_DIGEST,
      } as any,
    });

    const raw = (result.response.text() || "").trim();
    const parsed = tryParseJSON(raw) || tryParseJSON(stripCodeFences(raw));

    const digest: LessonDigest = {
      lessonId,
      keyConcepts,
      modulesSummary,
      transcriptDigest: parsed?.transcriptDigest || buildFallbackDigest(LEC),
      slidesDigest: parsed?.slidesDigest || buildFallbackDigest(SLD),
      formulasAndDefinitions: parsed?.formulasAndDefinitions || "",
      generatedAt: new Date().toISOString(),
    };

    // Save digest to lesson
    upsertLesson({ id: lessonId, digest });
    logger.info(`[Digest] Generated for lesson ${lessonId} (${JSON.stringify(digest).length} chars)`);

    return digest;
  } catch (err: any) {
    logger.warn(`[Digest] AI generation failed for ${lessonId}, using fallback:`, err?.message);
    // Fallback: extract key portions without AI
    const digest: LessonDigest = {
      lessonId,
      keyConcepts,
      modulesSummary,
      transcriptDigest: buildFallbackDigest(LEC),
      slidesDigest: buildFallbackDigest(SLD),
      formulasAndDefinitions: "",
      generatedAt: new Date().toISOString(),
    };
    upsertLesson({ id: lessonId, digest });
    return digest;
  }
}

/**
 * Get the digest for a lesson. Returns null if not generated yet.
 */
export function getDigest(lessonId: string): LessonDigest | null {
  const lesson = getLesson(lessonId);
  return lesson?.digest || null;
}

/**
 * Build a context string from digest for use in AI prompts.
 * Much smaller than full transcript+slides (~1K tokens vs ~9K tokens).
 */
export function buildDigestContext(digest: LessonDigest): string {
  const parts: string[] = [];

  if (digest.keyConcepts.length) {
    parts.push(`Key Concepts: ${digest.keyConcepts.join(", ")}`);
  }
  if (digest.modulesSummary) {
    parts.push(`Modules:\n${digest.modulesSummary}`);
  }
  if (digest.transcriptDigest) {
    parts.push(`Lecture Summary:\n${digest.transcriptDigest}`);
  }
  if (digest.slidesDigest) {
    parts.push(`Slides Summary:\n${digest.slidesDigest}`);
  }
  if (digest.formulasAndDefinitions) {
    parts.push(`Formulas & Definitions:\n${digest.formulasAndDefinitions}`);
  }

  return parts.join("\n\n");
}

/**
 * Get digest context for a lesson, with fallback to condensed context.
 * This is the primary function endpoints should use.
 */
export function getDigestOrFallback(lessonId: string): {
  context: string;
  isDigest: boolean;
} {
  const digest = getDigest(lessonId);
  if (digest) {
    return { context: buildDigestContext(digest), isDigest: true };
  }

  // Fallback to condensed context
  const lesson = getLesson(lessonId);
  if (!lesson) {
    return { context: "", isDigest: false };
  }

  const plan = lesson.plan as any;
  const parts: string[] = [];

  if (plan?.topic) parts.push(`Topic: ${plan.topic}`);
  if (plan?.key_concepts?.length) parts.push(`Key concepts: ${plan.key_concepts.join(", ")}`);
  if (plan?.modules?.length) {
    parts.push(`Modules:\n${plan.modules.slice(0, 6).map((m: any) => `- ${m.title}: ${m.goal || ""}`).join("\n")}`);
  }
  if (plan?.emphases?.length) {
    parts.push(`Emphases:\n${plan.emphases.slice(0, 8).map((e: any) => `- ${e.statement}`).join("\n")}`);
  }

  // Include truncated raw text as fallback
  const transcript = (lesson.transcript || "").slice(0, 4000);
  const slides = (lesson.slideText || "").slice(0, 2000);
  if (transcript) parts.push(`Transcript excerpt:\n${transcript}`);
  if (slides) parts.push(`Slides excerpt:\n${slides}`);

  return { context: parts.join("\n\n"), isDigest: false };
}

/**
 * Simple fallback: extract first/middle/last portions to capture key content.
 */
function buildFallbackDigest(text: string): string {
  if (!text || text.length < 200) return text;
  const third = Math.floor(text.length / 3);
  const start = text.slice(0, 600);
  const middle = text.slice(third, third + 600);
  const end = text.slice(-400);
  return `${start}\n...\n${middle}\n...\n${end}`;
}
