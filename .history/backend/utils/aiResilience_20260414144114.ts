import { logger } from "./logger";
import { AiCircuitOpenError, AiTimeoutError } from "../middleware/errorHandler";

/**
 * Circuit breaker for AI calls.
 * After `threshold` consecutive failures, opens the circuit for `cooldownMs`.
 * During cooldown, all calls are rejected immediately with AI_CIRCUIT_OPEN.
 */
class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;

  constructor(
    private readonly threshold: number = 3,
    private readonly cooldownMs: number = 60_000
  ) { }

  get isOpen(): boolean {
    if (Date.now() < this.openUntil) return true;
    if (this.openUntil > 0 && Date.now() >= this.openUntil) {
      // Half-open: allow one attempt
      this.openUntil = 0;
      this.failures = 0;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openUntil = 0;
  }

  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      logger.warn(
        { failures: this.failures, cooldownMs: this.cooldownMs },
        `AI circuit breaker OPEN — ${this.threshold} consecutive failures, cooling down for ${this.cooldownMs / 1000}s`
      );
    }
  }
}

const breaker = new CircuitBreaker(3, 60_000);

/** Test-only: reset the global circuit breaker state. NOT for production use. */
export function _resetBreakerForTests(): void {
  breaker.recordSuccess();
}

/**
 * Wraps an AI generateContent call with:
 * 1. Circuit breaker protection
 * 2. AbortController timeout (default 30s)
 * 3. Exponential backoff retry on 429/503
 */
export async function withAiResilience<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: { timeoutMs?: number; maxRetries?: number; label?: string } = {}
): Promise<T> {
  const { timeoutMs = 30_000, maxRetries = 2, label = "AI call" } = options;

  if (breaker.isOpen) {
    throw new AiCircuitOpenError();
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      breaker.recordSuccess();
      return result;
    } catch (err: unknown) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error(String(err));

      // Abort = timeout
      const errName = err instanceof Error ? err.name : "";
      if (errName === "AbortError" || controller.signal.aborted) {
        logger.warn({ attempt, label, timeoutMs }, `${label} timed out after ${timeoutMs}ms`);
        breaker.recordFailure();
        throw new AiTimeoutError();
      }

      // Rate limit (429) or service unavailable (503): retry with backoff
      const errRecord = err as Record<string, unknown>;
      const status = errRecord.status || errRecord.statusCode || errRecord.httpCode;
      if ((status === 429 || status === 503) && attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        logger.warn(
          { attempt, label, status, backoffMs },
          `${label} got ${status}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      // Non-retryable error
      breaker.recordFailure();
      throw err;
    }
  }

  breaker.recordFailure();
  throw lastError!;
}
