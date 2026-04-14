import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withAiResilience, _resetBreakerForTests } from "../aiResilience";
import { AiCircuitOpenError, AiTimeoutError } from "../../middleware/errorHandler";

vi.mock("../logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

describe("withAiResilience", () => {
  beforeEach(() => {
    _resetBreakerForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("success path", () => {
    it("returns the result on first try", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await withAiResilience(fn, { label: "test" });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("passes an AbortSignal to the function", async () => {
      const fn = vi.fn().mockImplementation((signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return Promise.resolve("ok");
      });
      await withAiResilience(fn);
      expect(fn).toHaveBeenCalled();
    });
  });

  describe("retry on 429/503", () => {
    it("retries on 429 with exponential backoff", async () => {
      vi.useFakeTimers();
      const err: Error & { status?: number } = Object.assign(new Error("rate limit"), { status: 429 });
      const fn = vi.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue("ok");

      const promise = withAiResilience(fn, { maxRetries: 2 });
      // First call fails, then waits for backoff
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("retries on 503 (service unavailable)", async () => {
      vi.useFakeTimers();
      const err: Error & { status?: number } = Object.assign(new Error("overloaded"), { status: 503 });
      const fn = vi.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue("ok");

      const promise = withAiResilience(fn);
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("gives up after maxRetries on persistent 429", async () => {
      vi.useFakeTimers();
      const err: Error & { status?: number } = Object.assign(new Error("rate limit"), { status: 429 });
      const fn = vi.fn().mockRejectedValue(err);

      const promise = withAiResilience(fn, { maxRetries: 2 }).catch((e) => e);
      await vi.runAllTimersAsync();
      const caught = await promise;
      expect(caught).toBe(err);
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("backoff includes random jitter (not deterministic)", async () => {
      vi.useFakeTimers();
      const err: Error & { status?: number } = Object.assign(new Error("rate limit"), { status: 429 });
      // Spy on Math.random — verify it's called for each retry (jitter source)
      const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

      const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue("ok");
      const promise = withAiResilience(fn, { maxRetries: 1 });
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toBe("ok");

      // Math.random should have been called at least once for jitter
      expect(randSpy).toHaveBeenCalled();
      randSpy.mockRestore();
    });

    it("does NOT retry on non-retryable errors (4xx other than 429)", async () => {
      const err: Error & { status?: number } = Object.assign(new Error("bad request"), { status: 400 });
      const fn = vi.fn().mockRejectedValue(err);

      await expect(withAiResilience(fn)).rejects.toBe(err);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("timeout", () => {
    it("aborts and throws AiTimeoutError after timeoutMs", async () => {
      vi.useFakeTimers();
      const fn = vi.fn().mockImplementation((signal: AbortSignal) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        });
      });

      const promise = withAiResilience(fn, { timeoutMs: 5_000 }).catch((e) => e);
      await vi.advanceTimersByTimeAsync(5_001);
      const caught = await promise;
      expect(caught).toBeInstanceOf(AiTimeoutError);
    });
  });

  describe("circuit breaker", () => {
    it("opens after 3 consecutive failures", async () => {
      const err = Object.assign(new Error("server error"), { status: 500 });
      const fn = vi.fn().mockRejectedValue(err);

      // 3 failures
      await expect(withAiResilience(fn)).rejects.toBe(err);
      await expect(withAiResilience(fn)).rejects.toBe(err);
      await expect(withAiResilience(fn)).rejects.toBe(err);

      // 4th call should be blocked by breaker
      const fn2 = vi.fn().mockResolvedValue("ok");
      await expect(withAiResilience(fn2)).rejects.toBeInstanceOf(AiCircuitOpenError);
      expect(fn2).not.toHaveBeenCalled();
    });

    it("resets failure count on success", async () => {
      const err = Object.assign(new Error("server error"), { status: 500 });
      const failFn = vi.fn().mockRejectedValue(err);
      const okFn = vi.fn().mockResolvedValue("ok");

      // 2 failures
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      // Success resets
      await withAiResilience(okFn);
      // Now 2 more failures should still not trip (only 2 since reset)
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      await expect(withAiResilience(failFn)).rejects.toBe(err);

      // Breaker still closed — okFn allowed
      const okFn2 = vi.fn().mockResolvedValue("yes");
      await expect(withAiResilience(okFn2)).resolves.toBe("yes");
    });

    it("retried-then-success does NOT pollute breaker (only final outcome counts)", async () => {
      vi.useFakeTimers();
      const err429: Error & { status?: number } = Object.assign(new Error("rate limit"), { status: 429 });
      // 2 retries that each succeed-after-429 should not trip the 3-strike breaker
      for (let i = 0; i < 3; i++) {
        const fn = vi.fn()
          .mockRejectedValueOnce(err429)
          .mockResolvedValue("ok");
        const promise = withAiResilience(fn);
        await vi.runAllTimersAsync();
        await expect(promise).resolves.toBe("ok");
      }
      // After 3 retried-success calls, breaker must still be closed
      const okFn = vi.fn().mockResolvedValue("still ok");
      await expect(withAiResilience(okFn)).resolves.toBe("still ok");
    });

    it("per-key isolation: each key has its own failure counter", async () => {
      const err = Object.assign(new Error("server error"), { status: 500 });
      const failFn = vi.fn().mockRejectedValue(err);

      // 2 failures on model-a (still under threshold)
      await expect(withAiResilience(failFn, { breakerKey: "model-c" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-c" })).rejects.toBe(err);

      // 2 failures on model-b should not count toward model-a's quota
      await expect(withAiResilience(failFn, { breakerKey: "model-d" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-d" })).rejects.toBe(err);

      // model-c can still tolerate one more failure (3rd trips it)
      await expect(withAiResilience(failFn, { breakerKey: "model-c" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-c" })).rejects.toBeInstanceOf(AiCircuitOpenError);
    });

    it("per-key isolation: tripping breaker A does NOT block breaker B", async () => {
      const err = Object.assign(new Error("server error"), { status: 500 });
      const failFn = vi.fn().mockRejectedValue(err);

      // Trip the breaker for "model-a"
      await expect(withAiResilience(failFn, { breakerKey: "model-a" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-a" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-a" })).rejects.toBe(err);
      await expect(withAiResilience(failFn, { breakerKey: "model-a" })).rejects.toBeInstanceOf(AiCircuitOpenError);

      // model-b should be UNAFFECTED
      const okFn = vi.fn().mockResolvedValue("ok-b");
      await expect(withAiResilience(okFn, { breakerKey: "model-b" })).resolves.toBe("ok-b");
    });

    it("re-opens (half-open) after cooldown elapses", async () => {
      vi.useFakeTimers();
      const err = Object.assign(new Error("server error"), { status: 500 });
      const failFn = vi.fn().mockRejectedValue(err);

      // Trip the breaker
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      await expect(withAiResilience(failFn)).rejects.toBe(err);
      await expect(withAiResilience(failFn)).rejects.toBeInstanceOf(AiCircuitOpenError);

      // Advance past 60s cooldown
      vi.advanceTimersByTime(60_001);

      // Now a call should be allowed (half-open state)
      const okFn = vi.fn().mockResolvedValue("recovered");
      await expect(withAiResilience(okFn)).resolves.toBe("recovered");
    });
  });
});
