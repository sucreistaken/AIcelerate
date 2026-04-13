import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the model imports so the module-level cache instances don't pull in mongoose
vi.mock("../../models/Room", () => ({}));
vi.mock("../../models/User", () => ({}));

import { TTLCache } from "../cache";

describe("TTLCache", () => {
  let cache: TTLCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new TTLCache<string>({ ttlMs: 5000, maxSize: 3, sweepIntervalMs: 60_000 });
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  // ── get / set basics ──────────────────────────────────────────────

  it("get() returns undefined for missing key", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("set()/get() stores and retrieves value", () => {
    cache.set("k1", "v1");
    expect(cache.get("k1")).toBe("v1");
  });

  it("set() overwrites existing key", () => {
    cache.set("k1", "v1");
    cache.set("k1", "v2");
    expect(cache.get("k1")).toBe("v2");
    expect(cache.size).toBe(1);
  });

  // ── TTL expiration ────────────────────────────────────────────────

  it("entries expire after TTL", () => {
    cache.set("k1", "v1");
    expect(cache.get("k1")).toBe("v1");

    vi.advanceTimersByTime(5001);

    expect(cache.get("k1")).toBeUndefined();
  });

  it("custom TTL per entry overrides default", () => {
    cache.set("short", "val", 1000);
    cache.set("long", "val", 10_000);

    vi.advanceTimersByTime(2000);

    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("long")).toBe("val");
  });

  it("sweep interval removes expired entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");

    vi.advanceTimersByTime(5001);

    // Trigger the sweep interval
    vi.advanceTimersByTime(60_000);

    expect(cache.size).toBe(0);
  });

  // ── del ───────────────────────────────────────────────────────────

  it("del() removes entry and returns true", () => {
    cache.set("k1", "v1");
    expect(cache.del("k1")).toBe(true);
    expect(cache.get("k1")).toBeUndefined();
  });

  it("del() returns false for missing key", () => {
    expect(cache.del("nope")).toBe(false);
  });

  // ── clear ─────────────────────────────────────────────────────────

  it("clear() removes all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  // ── LRU eviction ─────────────────────────────────────────────────

  it("evicts least recently accessed entry when at max capacity", () => {
    cache.set("a", "1"); // oldest
    vi.advanceTimersByTime(100);
    cache.set("b", "2");
    vi.advanceTimersByTime(100);
    cache.set("c", "3");

    // Cache is full (maxSize=3). Adding a 4th should evict "a" (least recently accessed).
    vi.advanceTimersByTime(100);
    cache.set("d", "4");

    expect(cache.get("a")).toBeUndefined(); // evicted
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
    expect(cache.size).toBe(3);
  });

  it("LRU eviction considers access time, not insertion order", () => {
    cache.set("a", "1");
    vi.advanceTimersByTime(100);
    cache.set("b", "2");
    vi.advanceTimersByTime(100);
    cache.set("c", "3");

    // Access "a" so it is no longer the LRU
    vi.advanceTimersByTime(100);
    cache.get("a");

    // Now "b" is the LRU
    vi.advanceTimersByTime(100);
    cache.set("d", "4");

    expect(cache.get("b")).toBeUndefined(); // evicted
    expect(cache.get("a")).toBe("1"); // kept because recently accessed
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("no eviction when updating existing key at max capacity", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Updating "a" should not trigger eviction
    cache.set("a", "updated");

    expect(cache.size).toBe(3);
    expect(cache.get("a")).toBe("updated");
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  // ── getOrSet ──────────────────────────────────────────────────────

  it("getOrSet() returns cached value if it exists", async () => {
    cache.set("k", "cached");
    const factory = vi.fn().mockResolvedValue("fresh");

    const result = await cache.getOrSet("k", factory);

    expect(result).toBe("cached");
    expect(factory).not.toHaveBeenCalled();
  });

  it("getOrSet() calls factory and caches result on miss", async () => {
    const factory = vi.fn().mockResolvedValue("computed");

    const result = await cache.getOrSet("k", factory);

    expect(result).toBe("computed");
    expect(factory).toHaveBeenCalledOnce();
    expect(cache.get("k")).toBe("computed");
  });

  it("getOrSet() deduplicates concurrent calls for same key", async () => {
    let resolveFactory: (val: string) => void;
    const factory = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => { resolveFactory = resolve; }),
    );

    // Fire two concurrent calls for the same key
    const p1 = cache.getOrSet("k", factory);
    const p2 = cache.getOrSet("k", factory);

    // Factory should only be called once
    expect(factory).toHaveBeenCalledOnce();

    resolveFactory!("deduped");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("deduped");
    expect(r2).toBe("deduped");
  });

  it("getOrSet() cleans up inflight map on factory error", async () => {
    const factory = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(cache.getOrSet("k", factory)).rejects.toThrow("fail");

    // A subsequent call should invoke the factory again (not return stale promise)
    const factory2 = vi.fn().mockResolvedValue("recovered");
    const result = await cache.getOrSet("k", factory2);
    expect(result).toBe("recovered");
    expect(factory2).toHaveBeenCalledOnce();
  });

  it("getOrSet() respects custom TTL", async () => {
    await cache.getOrSet("k", () => Promise.resolve("val"), 1000);
    expect(cache.get("k")).toBe("val");

    vi.advanceTimersByTime(1001);
    expect(cache.get("k")).toBeUndefined();
  });

  // ── invalidate ────────────────────────────────────────────────────

  it("invalidate('prefix:*') removes all matching keys", () => {
    cache.set("room:1", "a");
    cache.set("room:2", "b");
    cache.set("user:1", "c");

    const count = cache.invalidate("room:*");

    expect(count).toBe(2);
    expect(cache.get("room:1")).toBeUndefined();
    expect(cache.get("room:2")).toBeUndefined();
    expect(cache.get("user:1")).toBe("c");
  });

  it("invalidate('exact') removes exact key only", () => {
    cache.set("room:1", "a");
    cache.set("room:2", "b");

    const count = cache.invalidate("room:1");

    expect(count).toBe(1);
    expect(cache.get("room:1")).toBeUndefined();
    expect(cache.get("room:2")).toBe("b");
  });

  it("invalidate() returns 0 for no matches", () => {
    cache.set("a", "1");
    expect(cache.invalidate("nope:*")).toBe(0);
    expect(cache.invalidate("nope")).toBe(0);
  });

  // ── size ──────────────────────────────────────────────────────────

  it("size returns correct count", () => {
    expect(cache.size).toBe(0);
    cache.set("a", "1");
    expect(cache.size).toBe(1);
    cache.set("b", "2");
    expect(cache.size).toBe(2);
    cache.del("a");
    expect(cache.size).toBe(1);
  });

  // ── destroy ───────────────────────────────────────────────────────

  it("destroy() clears interval and data", () => {
    cache.set("a", "1");
    cache.set("b", "2");

    cache.destroy();

    expect(cache.size).toBe(0);
    // After destroy, advancing time should not cause errors
    vi.advanceTimersByTime(120_000);
  });
});
