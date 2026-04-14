import { GoogleGenerativeAI, GenerativeModel, GenerateContentRequest, EnhancedGenerateContentResponse } from "@google/generative-ai";
import { env } from "../config/env";
import { withAiResilience } from "../utils/aiResilience";
import { logger } from "../utils/logger";
import { AiCircuitOpenError, AiContentFilteredError, AiRateLimitedError } from "../middleware/errorHandler";
import { redis, isRedisReady } from "../config/redis";
import { getCurrentUserId } from "../utils/userContext";

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

// ── Concurrent AI request semaphore ─────────────────────────────────────────
// Caps the number of in-flight AI requests across all callers.
// Prevents memory/connection-pool exhaustion under sudden load and protects
// the upstream Gemini quota.
const MAX_CONCURRENT_AI_CALLS = Number(process.env.AI_MAX_CONCURRENT || 20);
const MAX_QUEUE_DEPTH = Number(process.env.AI_MAX_QUEUE_DEPTH || 100);
let inFlight = 0;
const waitQueue: (() => void)[] = [];

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT_AI_CALLS) {
    inFlight++;
    return;
  }
  // Reject new requests when the wait queue is saturated — graceful 503
  // is much better than letting RAM grow unbounded under DDOS or AI outage.
  if (waitQueue.length >= MAX_QUEUE_DEPTH) {
    throw new AiCircuitOpenError("AI service overloaded — queue full. Please try again shortly.");
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  inFlight++;
}

function releaseSlot(): void {
  inFlight--;
  const next = waitQueue.shift();
  if (next) next();
}

export function getConcurrentAiCount(): number {
  return inFlight;
}

// ── Per-user daily token budget ─────────────────────────────────────────────
// Tracks total tokens (input + output + thoughts) per user per UTC day.
// Backed by Redis with 25h TTL so usage rolls over naturally.
const DAILY_TOKEN_BUDGET = Number(process.env.AI_DAILY_TOKEN_BUDGET || 500_000);
const FALLBACK_USAGE_LIMIT = 5_000; // when Redis unavailable, soft-cap in-memory

const fallbackUsage = new Map<string, { date: string; tokens: number }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function userBudgetKey(userId: string): string {
  return `ai:budget:${userId}:${todayKey()}`;
}

/**
 * Read current day's token usage for a user.
 */
export async function getUserAiUsage(userId: string): Promise<{ usedTokens: number; limit: number; remaining: number; resetAt: string }> {
  let used = 0;
  if (isRedisReady()) {
    try {
      const raw = await redis.get(userBudgetKey(userId));
      used = raw ? Number(raw) : 0;
    } catch {
      used = fallbackUsage.get(userId)?.tokens ?? 0;
    }
  } else {
    const entry = fallbackUsage.get(userId);
    if (entry?.date === todayKey()) used = entry.tokens;
  }
  // Tomorrow at 00:00 UTC
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  return {
    usedTokens: used,
    limit: DAILY_TOKEN_BUDGET,
    remaining: Math.max(0, DAILY_TOKEN_BUDGET - used),
    resetAt: reset.toISOString(),
  };
}

/**
 * Throw AiRateLimitedError if user is over their daily token budget.
 * No-op if user is not in a request context (e.g., background jobs).
 */
async function assertUserWithinBudget(): Promise<void> {
  const userId = getCurrentUserId();
  if (!userId) return;
  const { usedTokens, limit } = await getUserAiUsage(userId);
  if (usedTokens >= limit) {
    throw new AiRateLimitedError(`Daily AI token budget exceeded (${usedTokens}/${limit}). Resets at midnight UTC.`);
  }
}

/**
 * Record token usage against the current user (if any).
 * Best-effort — failures are logged but never throw.
 */
async function recordUserUsage(totalTokens: number): Promise<void> {
  if (totalTokens <= 0) return;
  const userId = getCurrentUserId();
  if (!userId) return;

  if (isRedisReady()) {
    try {
      // INCRBY + EXPIRE in one round trip via Lua-less atomic chain
      const newTotal = await redis.incrby(userBudgetKey(userId), totalTokens);
      if (newTotal === totalTokens) {
        // First write today — set expiration (25h, rolls over the day boundary)
        await redis.expire(userBudgetKey(userId), 25 * 60 * 60);
      }
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "Redis user budget update failed");
    }
  }

  // In-memory fallback (bounded)
  if (fallbackUsage.size > FALLBACK_USAGE_LIMIT) return;
  const today = todayKey();
  const entry = fallbackUsage.get(userId);
  if (!entry || entry.date !== today) {
    fallbackUsage.set(userId, { date: today, tokens: totalTokens });
  } else {
    entry.tokens += totalTokens;
  }
}

// ── Safe response handlers ──────────────────────────────────────────────────
/**
 * Detect candidate-level safety blocks on a Gemini response.
 * Throws AiContentFilteredError if the candidate was blocked.
 */
function assertResponseSafe(response: EnhancedGenerateContentResponse | undefined, label: string): void {
  if (!response) return;
  const blockReason = response.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AiContentFilteredError(`Prompt blocked by safety filter (${label}): ${blockReason}`);
  }
  const candidate = response.candidates?.[0];
  if (candidate?.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
    throw new AiContentFilteredError(`Response blocked (${label}): ${candidate.finishReason}`);
  }
}

/**
 * Safely extract text from a Gemini response, throwing typed errors on safety blocks.
 * Most callers no longer need this — `safeGenerate` already runs `assertResponseSafe`
 * before returning. Keep for direct streaming-result usage.
 */
export function extractSafeText(response: EnhancedGenerateContentResponse | undefined): string {
  if (!response) throw new AiContentFilteredError("Empty AI response");
  assertResponseSafe(response, "extractSafeText");
  return response.text();
}

/**
 * Convert a raw Gemini SDK error into a typed AppError when possible.
 * Returns the original error otherwise so caller still has full context.
 */
function classifyAiError(err: unknown): Error {
  if (err instanceof AiCircuitOpenError || err instanceof AiContentFilteredError || err instanceof AiRateLimitedError) {
    return err;
  }
  const status = (err as { status?: number; statusCode?: number; httpCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode
    ?? (err as { httpCode?: number })?.httpCode;
  if (status === 429) {
    return new AiRateLimitedError();
  }
  return err instanceof Error ? err : new Error(String(err));
}

// ── Stream usage tracking ───────────────────────────────────────────────────
/**
 * Track token usage for a streaming/chat call after the stream completes.
 * Mirrors the metrics behavior of safeGenerate so streams are also accounted for.
 */
export function trackStreamUsage(
  label: string,
  modelName: string,
  startMs: number,
  response: EnhancedGenerateContentResponse | undefined,
  success: boolean
): void {
  const latencyMs = Date.now() - startMs;
  cumulativeMetrics.totalCalls++;
  cumulativeMetrics.totalLatencyMs += latencyMs;
  if (success) cumulativeMetrics.successCount++;
  else cumulativeMetrics.failureCount++;

  const usage = response?.usageMetadata as ({ promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined);
  trackAiCall({
    endpoint: label,
    inputTokensEst: usage?.promptTokenCount ?? 0,
    outputTokensEst: usage?.candidatesTokenCount ?? 0,
    thoughtsTokensEst: usage?.thoughtsTokenCount ?? 0,
    latencyMs,
    success,
    model: modelName,
  });
}

/**
 * Safe wrapper: calls generateContent with timeout, circuit breaker, retry,
 * automatic model fallback, safety detection, and typed error mapping.
 */
export async function safeGenerate(
  request: GenerateContentRequest,
  options?: { timeoutMs?: number; label?: string }
) {
  // Pre-flight: reject early if user is over daily budget
  await assertUserWithinBudget();

  await acquireSlot();
  try {
    const start = Date.now();
    let lastError: Error | null = null;

    for (const modelName of MODELS) {
      try {
        const result = await withAiResilience(
          async (signal) => {
            // Propagate AbortSignal to Gemini SDK so timeouts/disconnects
            // ALSO cancel the upstream call (avoids zombie quota burn).
            return await getModelInstance(modelName).generateContent(request, { signal });
          },
          {
            timeoutMs: options?.timeoutMs ?? 30_000,
            label: options?.label ?? "generateContent",
            breakerKey: modelName, // per-model breaker so 2.5 outage doesn't trip 2.0
          }
        );

        // Throw typed AiContentFilteredError on prompt OR candidate-level safety blocks
        // before the caller calls .text()
        assertResponseSafe(result.response, options?.label ?? "generateContent");

        const latencyMs = Date.now() - start;
        cumulativeMetrics.totalCalls++;
        cumulativeMetrics.totalLatencyMs += latencyMs;
        cumulativeMetrics.successCount++;
        if (modelName !== MODELS[0]) {
          cumulativeMetrics.fallbackCount++;
          logger.info({ model: modelName, label: options?.label }, "AI call succeeded on fallback model");
        }

        const usage = result.response?.usageMetadata as ({ promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined);
        trackAiCall({
          endpoint: options?.label ?? "generateContent",
          inputTokensEst: usage?.promptTokenCount ?? 0,
          outputTokensEst: usage?.candidatesTokenCount ?? 0,
          thoughtsTokensEst: usage?.thoughtsTokenCount ?? 0,
          latencyMs,
          success: true,
          model: modelName,
        });

        return result;
      } catch (err: unknown) {
        const typed = classifyAiError(err);
        lastError = typed;

        // Don't retry safety blocks (deterministic), rate limits (won't help on another model),
        // or circuit open (all models share the breaker)
        if (typed instanceof AiContentFilteredError || typed instanceof AiRateLimitedError || typed instanceof AiCircuitOpenError) {
          break;
        }

        if (modelName !== MODELS[MODELS.length - 1]) {
          logger.warn({ model: modelName, error: typed.message, label: options?.label }, "AI model failed, trying fallback");
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
      thoughtsTokensEst: 0,
      latencyMs,
      success: false,
    });

    throw lastError!;
  } finally {
    releaseSlot();
  }
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
  /** Gemini 2.5+ reasoning tokens (billed separately). 0 on older models. */
  thoughtsTokensEst?: number;
  latencyMs: number;
  success: boolean;
  retryCount?: number;
  model?: string;
}

export function trackAiCall(metrics: AiCallMetrics) {
  cumulativeMetrics.totalInputTokens += metrics.inputTokensEst;
  cumulativeMetrics.totalOutputTokens += metrics.outputTokensEst;
  cumulativeMetrics.totalThoughtsTokens += metrics.thoughtsTokensEst ?? 0;

  // Charge tokens against the current user's daily budget (best-effort)
  const totalTokens = metrics.inputTokensEst + metrics.outputTokensEst + (metrics.thoughtsTokensEst ?? 0);
  recordUserUsage(totalTokens).catch(() => { /* best-effort */ });

  logger.info({ ai: metrics }, `AI call: ${metrics.endpoint}`);
}

// Cumulative metrics exposed via /health/ai-metrics
const cumulativeMetrics = {
  totalCalls: 0,
  successCount: 0,
  failureCount: 0,
  fallbackCount: 0,
  totalLatencyMs: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalThoughtsTokens: 0,
};

export function getAiMetrics() {
  return {
    ...cumulativeMetrics,
    avgLatencyMs: cumulativeMetrics.totalCalls > 0
      ? Math.round(cumulativeMetrics.totalLatencyMs / cumulativeMetrics.totalCalls)
      : 0,
    inFlight,
    queueDepth: waitQueue.length,
    uptime: process.uptime(),
  };
}

// ── Utilities ────────────────────────────────────────────────────────────────
export const stripCodeFences = (s: string) =>
  s.replace(/```json/gi, "").replace(/```/g, "").trim();

export const tryParseJSON = (s: string) => {
  try { return JSON.parse(s); } catch { return null; }
};
