import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest } from "@google/generative-ai";
import { env } from "../config/env";
import { withAiResilience } from "../utils/aiResilience";
import { TTLCache } from "../utils/cache";
import { logger } from "../utils/logger";
import crypto from "crypto";

// ── Model management with fallback ──────────────────────────────────────────
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;
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

      trackAiCall({
        endpoint: options?.label ?? "generateContent",
        inputTokensEst: 0,
        outputTokensEst: 0,
        latencyMs,
        success: true,
        model: modelName,
      });

      return result;
    } catch (err: any) {
      lastError = err;
      // Only fallback on certain errors, not on circuit open or timeout
      if (modelName !== MODELS[MODELS.length - 1]) {
        logger.warn({ model: modelName, error: err.message, label: options?.label }, "AI model failed, trying fallback");
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

// ── AI Response Cache (deterministic endpoints) ─────────────────────────────
const aiResponseCache = new TTLCache<string>({ ttlMs: 5 * 60_000, maxSize: 100 });

function hashRequest(request: GenerateContentRequest): string {
  const content = JSON.stringify(request);
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Cached AI generation — use for deterministic endpoints (cheat sheet, quiz, mindmap).
 * DO NOT use for chat (which should always be fresh).
 */
export async function cachedGenerate(
  request: GenerateContentRequest,
  options?: { timeoutMs?: number; label?: string; cacheKey?: string }
): Promise<string> {
  const key = options?.cacheKey || hashRequest(request);

  return aiResponseCache.getOrSet(key, async () => {
    const result = await safeGenerate(request, options);
    return result.response.text();
  });
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
    cacheSize: aiResponseCache.size,
    uptime: process.uptime(),
  };
}

// ── Utilities ────────────────────────────────────────────────────────────────
export const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "").replace(/```/g, "").trim();

export const tryParseJSON = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
