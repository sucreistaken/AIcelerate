import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ComputedCache } from "../computedCache";

describe("ComputedCache", () => {
  let cache: ComputedCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new ComputedCache<string>(5000); // 5s default TTL
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  // ── get() - cache miss ────────────────────────────────────────────────

  describe("get() - cache miss", () => {
    it("returns undefined for non-existent key", () => {
      expect(cache.get("missing")).toBeUndefined();
    });

    it("returns undefined for empty cache", () => {
      expect(cache.get("any")).toBeUndefined();
    });
  });

  // ── set() / get() - basic store and retrieve ──────────────────────────

  describe("set() + get()", () => {
    it("stores and retrieves a value", () => {
      cache.set("key1", "value1");

      expect(cache.get("key1")).toBe("value1");
    });

    it("overwrites existing value for same key", () => {
      cache.set("k", "old");
      cache.set("k", "new");

      expect(cache.get("k")).toBe("new");
    });

    it("stores multiple distinct keys", () => {
      cache.set("a", "alpha");
      cache.set("b", "beta");

      expect(cache.get("a")).toBe("alpha");
      expect(cache.get("b")).toBe("beta");
    });
  });

  // ── TTL expiration ────────────────────────────────────────────────────

  describe("TTL expiration", () => {
    it("returns value before TTL expires", () => {
      cache.set("k", "v");

      vi.advanceTimersByTime(4999);
      expect(cache.get("k")).toBe("v");
    });

    it("returns undefined after TTL expires", () => {
      cache.set("k", "v");

      vi.advanceTimersByTime(5001);
      expect(cache.get("k")).toBeUndefined();
    });

    it("supports custom TTL per entry", () => {
      cache.set("short", "val", 1000); // 1s TTL
      cache.set("long", "val", 10000); // 10s TTL

      vi.advanceTimersByTime(2000);

      expect(cache.get("short")).toBeUndefined();
      expect(cache.get("long")).toBe("val");
    });

    it("re-setting a key resets its TTL", () => {
      cache.set("k", "v1");
      vi.advanceTimersByTime(3000);

      // Re-set refreshes TTL
      cache.set("k", "v2");
      vi.advanceTimersByTime(3000);

      // 3s since re-set, still within 5s TTL
      expect(cache.get("k")).toBe("v2");
    });

    it("expired entry is deleted on get (lazy eviction)", () => {
      cache.set("k", "v");
      vi.advanceTimersByTime(6000);

      // First get triggers deletion
      expect(cache.get("k")).toBeUndefined();
      // Second get confirms it is gone
      expect(cache.get("k")).toBeUndefined();
    });
  });

  // ── invalidate(key) ───────────────────────────────────────────────────

  describe("invalidate()", () => {
    it("removes a specific key", () => {
      cache.set("a", "1");
      cache.set("b", "2");

      cache.invalidate("a");

      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe("2");
    });

    it("does not throw when invalidating non-existent key", () => {
      expect(() => cache.invalidate("ghost")).not.toThrow();
    });
  });

  // ── invalidatePrefix(prefix) ──────────────────────────────────────────

  describe("invalidatePrefix()", () => {
    it("removes all keys matching the prefix", () => {
      cache.set("course:1:progress", "80%");
      cache.set("course:2:progress", "50%");
      cache.set("user:1:profile", "data");

      cache.invalidatePrefix("course:");

      expect(cache.get("course:1:progress")).toBeUndefined();
      expect(cache.get("course:2:progress")).toBeUndefined();
      expect(cache.get("user:1:profile")).toBe("data");
    });

    it("does nothing when no keys match", () => {
      cache.set("k1", "v1");

      cache.invalidatePrefix("nonexistent:");

      expect(cache.get("k1")).toBe("v1");
    });

    it("removes all keys when prefix matches everything", () => {
      cache.set("abc", "1");
      cache.set("abd", "2");

      cache.invalidatePrefix("ab");

      expect(cache.get("abc")).toBeUndefined();
      expect(cache.get("abd")).toBeUndefined();
    });
  });

  // ── clear() ───────────────────────────────────────────────────────────

  describe("clear()", () => {
    it("removes all entries", () => {
      cache.set("a", "1");
      cache.set("b", "2");

      cache.clear();

      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBeUndefined();
    });
  });

  // ── Memory limit / eviction ───────────────────────────────────────────

  describe("eviction at maxSize", () => {
    it("evicts the entry closest to expiring when at capacity", () => {
      const small = new ComputedCache<string>(10000, 3); // maxSize 3

      small.set("a", "1", 2000); // expires soonest
      small.set("b", "2", 5000);
      small.set("c", "3", 8000);

      // Cache is full (3/3). Adding a 4th should evict "a" (closest to expiring)
      small.set("d", "4", 6000);

      expect(small.get("a")).toBeUndefined(); // evicted
      expect(small.get("b")).toBe("2");
      expect(small.get("c")).toBe("3");
      expect(small.get("d")).toBe("4");

      small.destroy();
    });

    it("does not evict when updating an existing key at capacity", () => {
      const small = new ComputedCache<string>(10000, 2);

      small.set("a", "1");
      small.set("b", "2");

      // Update existing key -- should not trigger eviction
      small.set("a", "updated");

      expect(small.get("a")).toBe("updated");
      expect(small.get("b")).toBe("2");

      small.destroy();
    });

    it("evicts correctly with maxSize 1", () => {
      const tiny = new ComputedCache<string>(10000, 1);

      tiny.set("first", "1");
      tiny.set("second", "2");

      expect(tiny.get("first")).toBeUndefined();
      expect(tiny.get("second")).toBe("2");

      tiny.destroy();
    });
  });

  // ── Sweep (periodic cleanup) ──────────────────────────────────────────

  describe("sweep", () => {
    it("removes expired entries on sweep interval", () => {
      cache.set("expires-soon", "val", 1000);
      cache.set("stays", "val", 200_000);

      // Advance past the short TTL and past sweep interval (120s)
      vi.advanceTimersByTime(120_001);

      // "expires-soon" should be swept; "stays" survives
      expect(cache.get("expires-soon")).toBeUndefined();
      expect(cache.get("stays")).toBe("val");
    });
  });

  // ── destroy() ─────────────────────────────────────────────────────────

  describe("destroy()", () => {
    it("clears all entries and stops sweep timer", () => {
      cache.set("k", "v");
      cache.destroy();

      expect(cache.get("k")).toBeUndefined();
    });
  });

  // ── Type support ──────────────────────────────────────────────────────

  describe("generic type support", () => {
    it("works with object values", () => {
      const objCache = new ComputedCache<{ score: number; grade: string }>(5000);

      objCache.set("student:1", { score: 95, grade: "A" });

      const val = objCache.get("student:1");
      expect(val).toEqual({ score: 95, grade: "A" });

      objCache.destroy();
    });

    it("works with number values", () => {
      const numCache = new ComputedCache<number>(5000);

      numCache.set("count", 42);
      expect(numCache.get("count")).toBe(42);

      numCache.destroy();
    });
  });
});
