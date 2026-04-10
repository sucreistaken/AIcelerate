import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from "@google/generative-ai";
import { env } from "../config/env";
import { withAiResilience } from "../utils/aiResilience";

let _model: GenerativeModel | null = null;

export function getModel(): GenerativeModel {
  if (!_model) {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  return _model;
}

/**
 * Safe wrapper: calls generateContent with timeout, circuit breaker, and retry.
 * Use this instead of getModel().generateContent() directly.
 */
export async function safeGenerate(
  request: GenerateContentRequest,
  options?: { timeoutMs?: number; label?: string }
) {
  return withAiResilience(
    async (_signal) => {
      const result = await getModel().generateContent(request);
      return result;
    },
    { timeoutMs: options?.timeoutMs ?? 30_000, label: options?.label ?? "generateContent" }
  );
}

// ── Temperature profiles ──────────────────────────────────────────────────────
export type ModelProfile = "structured" | "creative" | "balanced";

const TEMPERATURE_MAP: Record<ModelProfile, number> = {
  structured: 0.1, // Quiz eval, LO alignment, digest
  creative:   0.7, // Chat, deep-dive, connection
  balanced:   0.3, // Plan, quiz creation, cheat sheet
};

export function getTemperature(profile: ModelProfile): number {
  return TEMPERATURE_MAP[profile];
}

// ── AI Call Tracking (OPT-14) ────────────────────────────────────────────────
import { logger } from "../utils/logger";

export interface AiCallMetrics {
  endpoint: string;
  inputTokensEst: number;
  outputTokensEst: number;
  latencyMs: number;
  success: boolean;
  retryCount?: number;
}

export function trackAiCall(metrics: AiCallMetrics) {
  logger.info({ ai: metrics }, `AI call: ${metrics.endpoint}`);
}

export const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "").replace(/```/g, "").trim();

export const tryParseJSON = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
