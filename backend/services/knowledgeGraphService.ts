// services/knowledgeGraphService.ts
// Extracts concept relationships from course lessons to build a knowledge graph.

import { safeGenerate, getTemperature, tryParseJSON, stripCodeFences, extractSafeText } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import { smartTruncate } from "../utils/smartTruncate";
import { logger } from "../utils/logger";
import { notFound, AppError } from "../middleware/errorHandler";
import { getLesson } from "./lessonDataService";
import type { Lesson } from "./lessonDataService";
import { getCourse, updateCourse } from "./courseDataService";
import type { KnowledgeGraph, ConceptNode, ConceptEdge } from "../types/knowledgeGraph";

function buildGraphPrompt(conceptsByLesson: string): string {
  return `You are an educational knowledge engineer. Analyze concepts from multiple lessons and extract a concept relationship graph.

For each concept:
- Assign a kebab-case id (e.g., "newtons-second-law")
- Classify its type: concept, principle, formula, technique, or definition
- Name it clearly

For relationships between concepts, identify:
- prerequisite: A must be understood before B
- extends: B builds on or deepens A
- applies: A is used/applied in B
- example_of: A illustrates B

Only include relationships you are confident about (confidence > 0.6).
Include a brief evidence string explaining why the relationship exists.

[CONCEPTS BY LESSON]
${conceptsByLesson}

Return a knowledge graph with nodes and edges.`.trim();
}

/**
 * Extract a knowledge graph from all lessons in a course.
 * Collects key_concepts, emphases, and module topics from each lesson,
 * then asks the AI to identify relationships between concepts.
 */
export async function extractGraphFromLessons(courseId: string): Promise<KnowledgeGraph> {
  const course = getCourse(courseId);
  if (!course) throw notFound("Course not found");

  const lessonIds = course.lessonIds || [];
  const conceptsByLesson: string[] = [];

  for (const lid of lessonIds) {
    const lesson = getLesson(lid);
    if (!lesson?.plan) continue;

    const plan = lesson.plan;
    const concepts = plan.key_concepts || [];
    const emphases = (plan.emphases || []).map((e: { statement: string }) => e.statement).filter(Boolean);
    const modules = (plan.modules || []).map((m: { title: string }) => m.title).filter(Boolean);

    if (concepts.length || emphases.length) {
      conceptsByLesson.push(
        `Lesson "${lesson.title}":\n  Concepts: ${concepts.join(", ")}\n  Emphases: ${emphases.slice(0, 5).join("; ")}\n  Modules: ${modules.join(", ")}`
      );
    }
  }

  if (conceptsByLesson.length === 0) {
    return { nodes: [], edges: [], builtAt: new Date().toISOString(), version: 1 };
  }

  const prompt = buildGraphPrompt(smartTruncate(conceptsByLesson.join("\n\n"), 6000));

  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4000,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.KNOWLEDGE_GRAPH as import("@google/generative-ai").ResponseSchema,
    },
  }, { label: "knowledge_graph", timeoutMs: 60_000 });

  const rawText = extractSafeText(result.response) || "";
  const parsed = tryParseJSON(rawText) ?? tryParseJSON(stripCodeFences(rawText));
  if (!parsed) {
    throw new AppError(502, "Knowledge graph AI response parse error", "AI_PARSE_ERROR");
  }

  logger.info(`[KNOWLEDGE_GRAPH] courseId=${courseId} | nodes=${parsed.nodes?.length || 0} edges=${parsed.edges?.length || 0}`);

  // Batch load all lessons once instead of N+1 lookups
  const lessonMap = new Map<string, Lesson>();
  for (const lid of lessonIds) {
    const lesson = getLesson(lid);
    if (lesson) lessonMap.set(lid, lesson);
  }

  // Post-process: assign lessonIds to each node based on which lessons mention the concept
  const nodes: ConceptNode[] = (parsed.nodes || []).map((n: { id: string; name: string; type: ConceptNode["type"] }) => {
    const matchingLessons: string[] = [];
    for (const lid of lessonIds) {
      const lesson = lessonMap.get(lid);
      if (!lesson?.plan) continue;
      const allTerms = [
        ...(lesson.plan.key_concepts || []),
        ...(lesson.plan.modules || []).map((m) => m.title || ""),
      ].map((t) => t.toLowerCase());
      if (allTerms.some(t => t.includes(n.name.toLowerCase()) || n.name.toLowerCase().includes(t))) {
        matchingLessons.push(lid);
      }
    }
    return {
      ...n,
      lessonIds: matchingLessons,
      strength: lessonIds.length > 0 ? matchingLessons.length / lessonIds.length : 0,
    };
  });

  const edges: ConceptEdge[] = (parsed.edges || []).filter(
    (e: { confidence: number }) => e.confidence >= 0.5
  );

  const graph: KnowledgeGraph = {
    nodes,
    edges,
    builtAt: new Date().toISOString(),
    version: course.knowledgeGraph?.version ? course.knowledgeGraph.version + 1 : 1,
  };

  // Persist on course
  updateCourse(courseId, { knowledgeGraph: graph });

  return graph;
}

/** Get cached knowledge graph for a course */
export function getKnowledgeGraph(courseId: string): KnowledgeGraph | null {
  const course = getCourse(courseId);
  return course?.knowledgeGraph || null;
}
