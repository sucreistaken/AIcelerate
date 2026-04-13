import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock redis — force in-memory fallback for tests
vi.mock("../../config/redis", () => ({
  redis: { eval: vi.fn() },
  isRedisReady: () => false,
}));

import { rateLimiter, checkSocketRateLimit } from "../rateLimiter";

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    ip: "127.0.0.1",
    headers: {},
    ...overrides,
  } as Parameters<ReturnType<typeof rateLimiter>>[0];
}

function createMockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as unknown as Parameters<ReturnType<typeof rateLimiter>>[1];
}

describe("rateLimiter", () => {
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const limiter = rateLimiter("test-allow", 5, 60_000);
    const req = createMockReq({ ip: "10.0.0.1" });
    const res = createMockRes();

    for (let i = 0; i < 5; i++) {
      await limiter(req, res, mockNext);
    }

    expect(mockNext).toHaveBeenCalledTimes(5);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when limit exceeded", async () => {
    const limiter = rateLimiter("test-429", 3, 60_000);
    const req = createMockReq({ ip: "10.0.0.2" });
    const res = createMockRes();

    for (let i = 0; i < 3; i++) {
      await limiter(req, res, mockNext);
    }
    expect(mockNext).toHaveBeenCalledTimes(3);

    await limiter(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Too many requests" })
    );
    expect(mockNext).toHaveBeenCalledTimes(3);
  });

  it("includes retryAfter in 429 response", async () => {
    const limiter = rateLimiter("test-retry", 1, 30_000);
    const req = createMockReq({ ip: "10.0.0.3" });
    const res = createMockRes();

    await limiter(req, res, mockNext);
    await limiter(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Too many requests",
        retryAfter: expect.any(Number),
      })
    );
  });

  it("resets after window expires", async () => {
    const windowMs = 10_000;
    const limiter = rateLimiter("test-reset", 2, windowMs);
    const req = createMockReq({ ip: "10.0.0.4" });
    const res = createMockRes();

    await limiter(req, res, mockNext);
    await limiter(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);

    await limiter(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(mockNext).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(windowMs + 1);

    const freshNext = vi.fn();
    await limiter(req, createMockRes(), freshNext);
    expect(freshNext).toHaveBeenCalledTimes(1);
  });

  it("uses userId when authenticated", async () => {
    const limiter = rateLimiter("test-user", 2, 60_000);
    const res = createMockRes();

    const req1 = createMockReq({ ip: "10.0.0.5", user: { userId: "shared-user" } });
    const req2 = createMockReq({ ip: "10.0.0.6", user: { userId: "shared-user" } });

    await limiter(req1, res, mockNext);
    await limiter(req2, res, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);

    await limiter(req1, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it("falls back to IP when not authenticated", async () => {
    const limiter = rateLimiter("test-ip", 2, 60_000);
    const res = createMockRes();

    const req = createMockReq({ ip: "10.0.0.7" });
    await limiter(req, res, mockNext);
    await limiter(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(2);

    await limiter(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(429);

    const differentIpReq = createMockReq({ ip: "10.0.0.8" });
    const freshNext = vi.fn();
    await limiter(differentIpReq, createMockRes(), freshNext);
    expect(freshNext).toHaveBeenCalledTimes(1);
  });

  it("different rate limiters don't interfere (separate stores)", async () => {
    const limiterA = rateLimiter("store-a", 1, 60_000);
    const limiterB = rateLimiter("store-b", 1, 60_000);
    const req = createMockReq({ ip: "10.0.0.9" });

    await limiterA(req, createMockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    const resA = createMockRes();
    await limiterA(req, resA, mockNext);
    expect(resA.status).toHaveBeenCalledWith(429);

    const nextB = vi.fn();
    await limiterB(req, createMockRes(), nextB);
    expect(nextB).toHaveBeenCalledTimes(1);
  });
});

describe("checkSocketRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when under limit", async () => {
    expect(await checkSocketRateLimit("sock-under", "user-a", 5, 60_000)).toBe(true);
    expect(await checkSocketRateLimit("sock-under", "user-a", 5, 60_000)).toBe(true);
    expect(await checkSocketRateLimit("sock-under", "user-a", 5, 60_000)).toBe(true);
  });

  it("returns false when limit exceeded", async () => {
    const name = "sock-over";
    const userId = "user-b";

    for (let i = 0; i < 3; i++) {
      expect(await checkSocketRateLimit(name, userId, 3, 60_000)).toBe(true);
    }

    expect(await checkSocketRateLimit(name, userId, 3, 60_000)).toBe(false);
    expect(await checkSocketRateLimit(name, userId, 3, 60_000)).toBe(false);
  });

  it("resets after window expires", async () => {
    const name = "sock-reset";
    const userId = "user-c";
    const windowMs = 5_000;

    await checkSocketRateLimit(name, userId, 1, windowMs);
    expect(await checkSocketRateLimit(name, userId, 1, windowMs)).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);

    expect(await checkSocketRateLimit(name, userId, 1, windowMs)).toBe(true);
  });

  it("tracks different users independently", async () => {
    const name = "sock-users";

    await checkSocketRateLimit(name, "user-x", 1, 60_000);
    expect(await checkSocketRateLimit(name, "user-x", 1, 60_000)).toBe(false);

    expect(await checkSocketRateLimit(name, "user-y", 1, 60_000)).toBe(true);
  });
});
