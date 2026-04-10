// services/confidenceService.ts
// Lightweight self-evaluation pass for AI-generated artifacts.
// Runs a quick validation prompt to score coverage, accuracy, completeness.

import { safeGenerate, getTemperature } from "./aiService";
import { SCHEMAS } from "../prompts/schemas";
import { smartTruncate } from "../utils/smartTruncate";
import { logger } from "../utils/logger";
import type { ConfidenceScore } from "../types";

type ArtifactType = "plan" | "cheatSheet" | "quiz" | "loModules";

function buildValidationPrompt(
  artifactType: ArtifactType,
  artifactJson: string,
  sourceContext: string
): string {
  return `You are a quality assurance reviewer for AI-generated educational content.

Rate the quality of this generated ${artifactType} by comparing it against the source material.

Score each dimension from 0.0 to 1.0:
- coverage: Does the artifact reflect all key topics from the source material?
- accuracy: Are all facts, terms, and explanations consistent with the source?
- completeness: Are all required sections present and properly populated?

If any issues are found, list them as short flags (e.g., "missing_formulas", "low_LO_coverage", "incomplete_sections").

[SOURCE MATERIAL SUMMARY]
${sourceContext}

[GENERATED ${artifactType.toUpperCase()}]
${artifactJson}`;
}

/**
 * Score an AI-generated artifact for quality.
 * Returns coverage, accuracy, completeness (0-1) and any warning flags.
 * Designed to be called fire-and-forget — never blocks main generation.
 */
export async function scoreArtifact(
  artifactType: ArtifactType,
  artifactJson: string,
  sourceContext: string
): Promise<ConfidenceScore> {
  const prompt = buildValidationPrompt(
    artifactType,
    smartTruncate(artifactJson, 3000),
    smartTruncate(sourceContext, 2000)
  );

  const result = await safeGenerate({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 200,
      temperature: getTemperature("structured"),
      responseMimeType: "application/json",
      responseSchema: SCHEMAS.CONFIDENCE_SCORE,
    } as any,
  }, { label: "confidence_score", timeoutMs: 15_000 });

  const rawText = result.response.text() || "";
  const parsed = JSON.parse(rawText);

  logger.info(
    `[CONFIDENCE] ${artifactType} | coverage=${parsed.coverage} accuracy=${parsed.accuracy} completeness=${parsed.completeness} flags=${parsed.flags?.length || 0}`
  );

  return {
    coverage: Math.max(0, Math.min(1, parsed.coverage)),
    accuracy: Math.max(0, Math.min(1, parsed.accuracy)),
    completeness: Math.max(0, Math.min(1, parsed.completeness)),
    flags: parsed.flags || [],
    scoredAt: new Date().toISOString(),
  };
}
