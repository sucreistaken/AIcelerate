import { logger } from "../utils/logger";
// controllers/connectionsController.ts
import { connectionsCache } from "../cache";
import { listLessons, getMemory } from "./lessonControllers";
import { GlobalMemoryModel } from "../models/GlobalMemory";
import { SCHEMAS } from "../prompts/schemas";
import { safeGenerate } from "../services/aiService";

export type ConceptConnection = {
  concept: string;
  lessonIds: string[];
  lessonTitles: string[];
  strength: number;
  relatedConcepts: string[];
  aiInsight?: string;
};

// Build connections by scanning all lessons (cached 120s when no AI enrichment)
export async function buildConnections(userId: string, enrich: boolean = false): Promise<ConceptConnection[]> {
  // Use cached result if available and no AI enrichment requested
  if (!enrich) {
    const cached = connectionsCache.get(`connections:${userId}`);
    if (cached) return cached;
  }

  const lessons = listLessons();
  const memory = await getMemory();

  // concept -> { lessonIds, lessonTitles }
  const conceptMap = new Map<string, { lessonIds: Set<string>; lessonTitles: Set<string> }>();

  for (const lesson of lessons) {
    if (!lesson.plan) continue;

    const terms = new Set<string>();

    // From key_concepts
    if (lesson.plan.key_concepts) {
      for (const c of lesson.plan.key_concepts) {
        if (c) terms.add(c.toLowerCase().trim());
      }
    }

    // From highlights
    if (lesson.highlights) {
      for (const h of lesson.highlights) {
        if (h) terms.add(h.toLowerCase().trim());
      }
    }

    // From emphases statements
    const emphases = lesson.plan.emphases || lesson.professorEmphases || [];
    for (const e of emphases) {
      if (e.statement) {
        // Extract key phrases (simplified NLP: take first 4-5 words)
        const words = e.statement.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
        if (words.length > 5) terms.add(words);
      }
    }

    // From module titles
    if (lesson.plan.modules) {
      for (const mod of lesson.plan.modules) {
        if (mod.title) terms.add(mod.title.toLowerCase().trim());
      }
    }

    // Register each term
    for (const term of terms) {
      if (!conceptMap.has(term)) {
        conceptMap.set(term, { lessonIds: new Set(), lessonTitles: new Set() });
      }
      const entry = conceptMap.get(term)!;
      entry.lessonIds.add(lesson.id);
      entry.lessonTitles.add(lesson.title);
    }
  }

  // Cross-reference with recurring concepts from memory
  const recurringSet = new Set(
    (memory.recurringConcepts || []).map((c: string) => c.toLowerCase().trim())
  );

  // Build inverted index: lessonId -> Set<concept> for O(1) co-occurrence lookup
  const lessonToConcepts = new Map<string, Set<string>>();
  for (const [concept, data] of conceptMap) {
    for (const lessonId of data.lessonIds) {
      if (!lessonToConcepts.has(lessonId)) lessonToConcepts.set(lessonId, new Set());
      lessonToConcepts.get(lessonId)!.add(concept);
    }
  }

  // Build connections for concepts appearing in 2+ lessons
  const multiLessonConnections: ConceptConnection[] = [];

  for (const [concept, data] of conceptMap) {
    if (data.lessonIds.size < 2) continue;

    // Find related concepts via inverted index (O(k) instead of O(n^2))
    const relatedSet = new Set<string>();
    for (const lessonId of data.lessonIds) {
      const coOccurring = lessonToConcepts.get(lessonId);
      if (coOccurring) {
        for (const other of coOccurring) {
          if (other !== concept) relatedSet.add(other);
          if (relatedSet.size >= 5) break;
        }
      }
      if (relatedSet.size >= 5) break;
    }
    const relatedConcepts = [...relatedSet].slice(0, 5);

    const baseFraction = data.lessonIds.size / Math.max(1, lessons.length);
    const boost = recurringSet.has(concept) ? 0.2 : 0;
    const strength = Math.min(1, Math.round((baseFraction + boost) * 100) / 100);

    multiLessonConnections.push({
      concept,
      lessonIds: [...data.lessonIds],
      lessonTitles: [...data.lessonTitles],
      strength,
      relatedConcepts,
    });
  }

  // If no cross-lesson connections, include single-lesson key concepts
  // so the feature always shows useful data
  let connections: ConceptConnection[];

  if (multiLessonConnections.length > 0) {
    connections = multiLessonConnections;
  } else {
    connections = [];
    for (const [concept, data] of conceptMap) {
      // Find related concepts via inverted index (O(k) instead of O(n^2))
      const relatedSet = new Set<string>();
      for (const lessonId of data.lessonIds) {
        const coOccurring = lessonToConcepts.get(lessonId);
        if (coOccurring) {
          for (const other of coOccurring) {
            if (other !== concept) relatedSet.add(other);
            if (relatedSet.size >= 5) break;
          }
        }
        if (relatedSet.size >= 5) break;
      }
      const relatedConcepts = [...relatedSet].slice(0, 5);

      const isRecurring = recurringSet.has(concept);
      const strength = Math.min(
        1,
        Math.round(((isRecurring ? 0.4 : 0.15) + relatedConcepts.length * 0.05) * 100) / 100
      );

      connections.push({
        concept,
        lessonIds: [...data.lessonIds],
        lessonTitles: [...data.lessonTitles],
        strength,
        relatedConcepts,
      });
    }
  }

  // Sort by strength descending
  connections.sort((a, b) => b.strength - a.strength);

  // Generate AI insights for top 20 connections
  if (enrich && connections.length > 0) {
    const top = connections.slice(0, 20);
    const batch = top.map((c) => ({
      concept: c.concept,
      lessons: c.lessonTitles,
      related: c.relatedConcepts.slice(0, 3),
    }));

    try {
      const prompt = `You are an educational AI. For each concept below, write a concise 1-2 sentence insight explaining WHY this concept bridges the listed lessons and why that connection matters for the student.

Return a JSON array of objects: [{"concept": "...", "insight": "..."}]

Concepts:
${JSON.stringify(batch, null, 2)}`;

      const result = await safeGenerate({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
          responseSchema: SCHEMAS.CONNECTION_INSIGHTS as import("@google/generative-ai").ResponseSchema,
        },
      }, { label: "connections_build", timeoutMs: 45_000 });
      const raw = result.response.text();
      logger.info(`[AI] CONNECTION_INSIGHTS | ~${Math.ceil(prompt.length / 4)} in, ~${Math.ceil(raw.length / 4)} out | max=1500`);
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        const insightMap = new Map<string, string>();
        for (const item of parsed) {
          if (item.concept && item.insight) {
            insightMap.set(item.concept.toLowerCase().trim(), item.insight);
          }
        }
        for (const conn of connections) {
          const insight = insightMap.get(conn.concept.toLowerCase().trim());
          if (insight) conn.aiInsight = insight;
        }
      }
    } catch (err) {
      logger.warn("AI insights generation failed (connections still saved):", err);
    }
  }

  // Save connections to MongoDB scoped to user
  try {
    await GlobalMemoryModel.findOneAndUpdate(
      { userId },
      { $set: { connections } },
      { upsert: true }
    );
  } catch (err) {
    logger.error("Failed to save connections to MongoDB", err);
  }

  // Cache the computed result (scoped by userId)
  connectionsCache.set(`connections:${userId}`, connections);

  return connections;
}

// Get existing connections for a user
export async function getConnections(userId: string): Promise<ConceptConnection[]> {
  try {
    const doc = await GlobalMemoryModel.findOne({ userId }).lean();
    if (doc?.connections?.length) {
      return doc.connections.map((c: { concept: string; lessonIds?: string[]; lessonTitles?: string[]; strength?: number; relatedConcepts?: string[]; aiInsight?: string }) => ({
        concept: c.concept,
        lessonIds: c.lessonIds || [],
        lessonTitles: c.lessonTitles || [],
        strength: c.strength || 0,
        relatedConcepts: c.relatedConcepts || [],
        aiInsight: c.aiInsight,
      }));
    }
  } catch (err) {
    logger.error("Failed to load connections from MongoDB", err);
  }
  return [];
}
