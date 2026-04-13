import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from "@google/generative-ai";
import { env } from "../config/env";
import { withAiResilience } from "../utils/aiResilience";
import { logger } from "../utils/logger";
import { AiCircuitOpenError } from "../middleware/errorHandler";

// ── Model management with fallback ──────────────────────────────────────────
const MODELS = (process.env.AI_MODELS || "gemini-2.5-flash,gemini-2.0-flash").split(",").map(s => s.trim());
const modelInstances = new Map<string, GenerativeModel>();

function getModelInstance(modelName: string): GenerativeModel {
  if (!modelInstances.has(modelName)) {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    modelInstances.set(modelName, genAI.getGenerativeModel({ model: modelName }));
  }
  return modelInstances.get(modelName)!;
}

export function getModel(): GenerativeModel {
  return getModelInstance(MODELS[0]);
}

/**
 * Safe wrapper: calls generateContent with timeout, circuit breaker, retry,
 * and automatic model fallback.
 */
export async function safeGenerate(
  request: GenerateContentRequest,
  options?: { timeoutMs?: number; label?: string }
) {
  const start = Date.now();
  let lastError: Error | null = null;

  for (const modelName of MODELS) {
    try {
      const result = await withAiResilience(
        async (_signal) => {
          return await getModelInstance(modelName).generateContent(request);
        },
        { timeoutMs: options?.timeoutMs ?? 30_000, label: options?.label ?? "generateContent" }
      );

      const latencyMs = Date.now() - start;
      cumulativeMetrics.totalCalls++;
      cumulativeMetrics.totalLatencyMs += latencyMs;
      cumulativeMetrics.successCount++;
      if (modelName !== MODELS[0]) {
        cumulativeMetrics.fallbackCount++;
        logger.info({ model: modelName, label: options?.label }, "AI call succeeded on fallback model");
      }

      // Extract token usage from Gemini response metadata
      const usage = result.response?.usageMetadata;
      trackAiCall({
        endpoint: options?.label ?? "generateContent",
        inputTokensEst: usage?.promptTokenCount ?? 0,
        outputTokensEst: usage?.candidatesTokenCount ?? 0,
        latencyMs,
        success: true,
        model: modelName,
      });

      return result;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't fallback on 429 (quota/billing) — another model won't help
      const errRecord = err as Record<string, unknown>;
      const is429 = errRecord.status === 429;
      // Don't fallback on circuit breaker open — all models share the breaker
      const isCircuitOpen = err instanceof AiCircuitOpenError;

      if (modelName !== MODELS[MODELS.length - 1] && !is429 && !isCircuitOpen) {
        logger.warn({ model: modelName, error: lastError.message, label: options?.label }, "AI model failed, trying fallback");
        continue;
      }
    }
  }

  const latencyMs = Date.now() - start;
  cumulativeMetrics.totalCalls++;
  cumulativeMetrics.totalLatencyMs += latencyMs;
  cumulativeMetrics.failureCount++;

  trackAiCall({
    endpoint: options?.label ?? "generateContent",
    inputTokensEst: 0,
    outputTokensEst: 0,
    latencyMs,
    success: false,
  });

  throw lastError!;
}

// ── Temperature profiles ──────────────────────────────────────────────────────
export type ModelProfile = "structured" | "creative" | "balanced";

const TEMPERATURE_MAP: Record<ModelProfile, number> = {
  structured: Number(process.env.AI_TEMP_STRUCTURED || 0.1),
  creative:   Number(process.env.AI_TEMP_CREATIVE || 0.7),
  balanced:   Number(process.env.AI_TEMP_BALANCED || 0.3),
};

export function getTemperature(profile: ModelProfile): number {
  return TEMPERATURE_MAP[profile];
}

// ── AI Call Tracking + Cumulative Metrics ────────────────────────────────────
export interface AiCallMetrics {
  endpoint: string;
  inputTokensEst: number;
  outputTokensEst: number;
  latencyMs: number;
  success: boolean;
  retryCount?: number;
  model?: string;
}

export function trackAiCall(metrics: AiCallMetrics) {
  logger.info({ ai: metrics }, `AI call: ${metrics.endpoint}`);
}

// Cumulative metrics exposed via /health/ai-metrics
const cumulativeMetrics = {
  totalCalls: 0,
  successCount: 0,
  failureCount: 0,
  fallbackCount: 0,
  totalLatencyMs: 0,
  cacheHits: 0,
};

export function getAiMetrics() {
  return {
    ...cumulativeMetrics,
    avgLatencyMs: cumulativeMetrics.totalCalls > 0
      ? Math.round(cumulativeMetrics.totalLatencyMs / cumulativeMetrics.totalCalls)
      : 0,
    cacheHitRate: cumulativeMetrics.totalCalls > 0
      ? cumulativeMetrics.cacheHits / cumulativeMetrics.totalCalls
      : 0,
    uptime: process.uptime(),
  };
}

// ── Utilities ────────────────────────────────────────────────────────────────
export const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "").replace(/```/g, "").trim();

export const tryParseJSON = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
