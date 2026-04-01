import { logger } from "../utils/logger";
import { getModel, getTemperature } from "./aiService";
import { listLessons } from "../controllers/lessonControllers";
import { badRequest } from "../middleware/errorHandler";
import { getLangDirective, type SupportedLang } from "../utils/langDirective";

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
        .map((e: any) => e.statement)
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

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2000, temperature: getTemperature("creative") },
  });
  const analysis = result.response.text();
  logger.info(`[AI] CONNECTION_DEEP_DIVE | concept=${concept} | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(analysis.length / 4)} out`);

  return analysis;
}
