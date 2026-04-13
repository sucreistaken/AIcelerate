import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Mock fs and fs/promises ─────────────────────────────────────────────────
const mockExistsSync = vi.fn().mockReturnValue(true);
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockReadFileSync = vi.fn().mockReturnValue("[]");

vi.mock("fs", () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
  },
}));

const mockFspWriteFile = vi.fn().mockResolvedValue(undefined);
const mockFspRename = vi.fn().mockResolvedValue(undefined);

vi.mock("fs/promises", () => ({
  default: {
    writeFile: (...args: any[]) => mockFspWriteFile(...args),
    rename: (...args: any[]) => mockFspRename(...args),
  },
}));

import { DataCache } from "../dataCache";

// ── Helpers ─────────────────────────────────────────────────────────────────

interface TestItem {
  id: string;
  name: string;
  category?: string;
}

function makeCache(overrides: Partial<import("../dataCache").DataCacheOptions> = {}): DataCache<TestItem> {
  return new DataCache<TestItem>({
    filePath: "/tmp/test-cache.json",
    flushDebounceMs: 500,
    name: "test",
    ...overrides,
  });
}

function makeItem(overrides: Partial<TestItem> = {}): TestItem {
  return { id: "item-1", name: "Alpha", category: "a", ...overrides };
}

describe("DataCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: file exists, reads empty array
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("[]");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Constructor / Initialization ───────────────────────────────────────

  describe("constructor", () => {
    it("loads data from disk on construction", () => {
      const items = [makeItem({ id: "1", name: "One" })];
      mockReadFileSync.mockReturnValue(JSON.stringify(items));

      const cache = makeCache();

      expect(mockReadFileSync).toHaveBeenCalledWith("/tmp/test-cache.json", "utf-8");
      expect(cache.get("1")).toEqual({ id: "1", name: "One", category: "a" });
    });

    it("creates file if it does not exist", () => {
      mockExistsSync.mockImplementation((p: string) => {
        if (p.endsWith("test-cache.json")) return false;
        return true; // directory exists
      });

      makeCache();

      expect(mockWriteFileSync).toHaveBeenCalledWith("/tmp/test-cache.json", "[]", "utf-8");
    });

    it("creates directory if it does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      makeCache();

      expect(mockMkdirSync).toHaveBeenCalledWith("/tmp", { recursive: true });
    });

    it("starts with empty cache if file read fails", () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const cache = makeCache();

      expect(cache.getAll()).toEqual([]);
      expect(cache.count()).toBe(0);
    });

    it("uses custom keyField when provided", () => {
      const items = [{ slug: "my-item", title: "Hello" }];
      mockReadFileSync.mockReturnValue(JSON.stringify(items));

      const cache = new DataCache<{ slug: string; title: string }>({
        filePath: "/tmp/slug-cache.json",
        keyField: "slug",
      });

      expect(cache.get("my-item")).toEqual({ slug: "my-item", title: "Hello" });
    });

    it("defaults flushDebounceMs to 500", async () => {
      // The cache should not flush until 500ms after a write
      const cache = new DataCache<TestItem>({
        filePath: "/tmp/default-debounce.json",
      });
      cache.set(makeItem());

      // At 499ms, no flush yet
      await vi.advanceTimersByTimeAsync(499);
      expect(mockFspWriteFile).not.toHaveBeenCalled();

      // At 500ms, flush fires
      await vi.advanceTimersByTimeAsync(1);
      expect(mockFspWriteFile).toHaveBeenCalled();
    });
  });

  // ── get(id) ────────────────────────────────────────────────────────────

  describe("get()", () => {
    it("returns item by ID", () => {
      const items = [makeItem({ id: "a" }), makeItem({ id: "b", name: "Beta" })];
      mockReadFileSync.mockReturnValue(JSON.stringify(items));

      const cache = makeCache();

      expect(cache.get("a")).toEqual(items[0]);
      expect(cache.get("b")).toEqual(items[1]);
    });

    it("returns null for missing ID", () => {
      const cache = makeCache();

      expect(cache.get("nonexistent")).toBeNull();
    });

    it("returns null on empty cache", () => {
      const cache = makeCache();

      expect(cache.get("anything")).toBeNull();
    });
  });

  // ── set(item) ──────────────────────────────────────────────────────────

  describe("set()", () => {
    it("adds a new item", () => {
      const cache = makeCache();
      const item = makeItem({ id: "new-1", name: "NewItem" });

      cache.set(item);

      expect(cache.get("new-1")).toEqual(item);
      expect(cache.count()).toBe(1);
    });

    it("updates an existing item in-place", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "x" })]));
      const cache = makeCache();

      cache.set(makeItem({ id: "x", name: "Updated" }));

      expect(cache.get("x")!.name).toBe("Updated");
      expect(cache.count()).toBe(1);
    });

    it("triggers debounced disk flush", async () => {
      const cache = makeCache();
      cache.set(makeItem());

      // Not flushed yet
      expect(mockFspWriteFile).not.toHaveBeenCalled();

      // After debounce interval
      await vi.advanceTimersByTimeAsync(500);
      expect(mockFspWriteFile).toHaveBeenCalledTimes(1);
    });

    it("batches multiple rapid writes into one flush", async () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "1" }));
      cache.set(makeItem({ id: "2" }));
      cache.set(makeItem({ id: "3" }));

      await vi.advanceTimersByTimeAsync(500);

      // Single flush for all three writes
      expect(mockFspWriteFile).toHaveBeenCalledTimes(1);
    });

    it("preserves order when updating existing item", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a", name: "A" }),
          makeItem({ id: "b", name: "B" }),
          makeItem({ id: "c", name: "C" }),
        ])
      );
      const cache = makeCache();

      cache.set(makeItem({ id: "b", name: "B-updated" }));

      const all = cache.getAll();
      expect(all[1].name).toBe("B-updated");
      expect(all[0].id).toBe("a");
      expect(all[2].id).toBe("c");
    });
  });

  // ── setAll(items) ──────────────────────────────────────────────────────

  describe("setAll()", () => {
    it("replaces entire dataset", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "old" })]));
      const cache = makeCache();

      const newItems = [makeItem({ id: "x" }), makeItem({ id: "y" })];
      cache.setAll(newItems);

      expect(cache.get("old")).toBeNull();
      expect(cache.get("x")).toEqual(newItems[0]);
      expect(cache.get("y")).toEqual(newItems[1]);
      expect(cache.count()).toBe(2);
    });

    it("handles empty array (clears cache)", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "a" })]));
      const cache = makeCache();

      cache.setAll([]);

      expect(cache.count()).toBe(0);
      expect(cache.getAll()).toEqual([]);
    });

    it("triggers disk flush", async () => {
      const cache = makeCache();
      cache.setAll([makeItem()]);

      await vi.advanceTimersByTimeAsync(500);
      expect(mockFspWriteFile).toHaveBeenCalled();
    });
  });

  // ── delete(id) ─────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("removes an existing item and returns true", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "d1" })]));
      const cache = makeCache();

      const result = cache.delete("d1");

      expect(result).toBe(true);
      expect(cache.get("d1")).toBeNull();
      expect(cache.count()).toBe(0);
    });

    it("returns false for non-existent key", () => {
      const cache = makeCache();

      expect(cache.delete("ghost")).toBe(false);
    });

    it("triggers disk flush after delete", async () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "d2" })]));
      const cache = makeCache();

      cache.delete("d2");

      await vi.advanceTimersByTimeAsync(500);
      expect(mockFspWriteFile).toHaveBeenCalled();
    });

    it("uses swap-remove for O(1) deletion (internal list consistency)", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a" }),
          makeItem({ id: "b" }),
          makeItem({ id: "c" }),
        ])
      );
      const cache = makeCache();

      // Delete middle element -> last element moves to its position
      cache.delete("a");

      expect(cache.count()).toBe(2);
      expect(cache.get("b")).not.toBeNull();
      expect(cache.get("c")).not.toBeNull();
      // After swap-remove, list length should be 2
      expect(cache.getAll()).toHaveLength(2);
    });
  });

  // ── getAll() ───────────────────────────────────────────────────────────

  describe("getAll()", () => {
    it("returns all items as array", () => {
      const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];
      mockReadFileSync.mockReturnValue(JSON.stringify(items));
      const cache = makeCache();

      expect(cache.getAll()).toEqual(items);
    });

    it("returns empty array for empty cache", () => {
      const cache = makeCache();

      expect(cache.getAll()).toEqual([]);
    });

    it("reflects mutations from set/delete", () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "x" }));
      cache.set(makeItem({ id: "y" }));

      expect(cache.getAll()).toHaveLength(2);

      cache.delete("x");
      expect(cache.getAll()).toHaveLength(1);
    });
  });

  // ── filter(predicate) ─────────────────────────────────────────────────

  describe("filter()", () => {
    it("returns items matching predicate", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a", category: "cat1" }),
          makeItem({ id: "b", category: "cat2" }),
          makeItem({ id: "c", category: "cat1" }),
        ])
      );
      const cache = makeCache();

      const result = cache.filter((item) => item.category === "cat1");

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.category === "cat1")).toBe(true);
    });

    it("returns empty array when nothing matches", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem()]));
      const cache = makeCache();

      expect(cache.filter(() => false)).toEqual([]);
    });

    it("returns empty array on empty cache", () => {
      const cache = makeCache();

      expect(cache.filter(() => true)).toEqual([]);
    });
  });

  // ── getByIndex(field, value) ──────────────────────────────────────────

  describe("getByIndex()", () => {
    it("returns items by indexed field value (O(1) lookup)", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a", category: "cat1" }),
          makeItem({ id: "b", category: "cat2" }),
          makeItem({ id: "c", category: "cat1" }),
        ])
      );
      const cache = makeCache();
      cache.addIndex("category");

      const result = cache.getByIndex("category", "cat1");

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.category === "cat1")).toBe(true);
    });

    it("returns empty array for unmatched index value", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "a", category: "cat1" })]));
      const cache = makeCache();
      cache.addIndex("category");

      expect(cache.getByIndex("category", "nonexistent")).toEqual([]);
    });

    it("falls back to linear filter when field is not indexed", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a", category: "cat1" }),
          makeItem({ id: "b", category: "cat2" }),
        ])
      );
      const cache = makeCache();
      // No addIndex call — field is not indexed

      const result = cache.getByIndex("category", "cat1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a");
    });

    it("updates index when item is set", () => {
      const cache = makeCache();
      cache.addIndex("category");

      cache.set(makeItem({ id: "a", category: "cat1" }));

      expect(cache.getByIndex("category", "cat1")).toHaveLength(1);

      // Update same item with different category
      cache.set(makeItem({ id: "a", category: "cat2" }));

      expect(cache.getByIndex("category", "cat1")).toHaveLength(0);
      expect(cache.getByIndex("category", "cat2")).toHaveLength(1);
    });

    it("updates index when item is deleted", () => {
      const cache = makeCache();
      cache.addIndex("category");
      cache.set(makeItem({ id: "a", category: "cat1" }));

      cache.delete("a");

      expect(cache.getByIndex("category", "cat1")).toHaveLength(0);
    });

    it("rebuilds index on setAll", () => {
      const cache = makeCache();
      cache.addIndex("category");
      cache.set(makeItem({ id: "old", category: "old-cat" }));

      cache.setAll([
        makeItem({ id: "x", category: "new-cat" }),
        makeItem({ id: "y", category: "new-cat" }),
      ]);

      expect(cache.getByIndex("category", "old-cat")).toHaveLength(0);
      expect(cache.getByIndex("category", "new-cat")).toHaveLength(2);
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles duplicate IDs in initial data (last wins in Map)", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "dup", name: "First" }),
          makeItem({ id: "dup", name: "Second" }),
        ])
      );
      const cache = makeCache();

      // Map.set overwrites, so last one wins
      expect(cache.get("dup")!.name).toBe("Second");
    });

    it("concurrent sets to different IDs are independent", () => {
      const cache = makeCache();

      cache.set(makeItem({ id: "a", name: "A" }));
      cache.set(makeItem({ id: "b", name: "B" }));

      expect(cache.get("a")!.name).toBe("A");
      expect(cache.get("b")!.name).toBe("B");
      expect(cache.count()).toBe(2);
    });

    it("rapid set then delete leaves item removed", () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "temp" }));
      cache.delete("temp");

      expect(cache.get("temp")).toBeNull();
      expect(cache.count()).toBe(0);
    });

    it("find() returns first matching item", () => {
      mockReadFileSync.mockReturnValue(
        JSON.stringify([
          makeItem({ id: "a", name: "Alpha" }),
          makeItem({ id: "b", name: "Beta" }),
        ])
      );
      const cache = makeCache();

      const found = cache.find((item) => item.name.startsWith("A"));
      expect(found).not.toBeNull();
      expect(found!.id).toBe("a");
    });

    it("find() returns null when no match", () => {
      const cache = makeCache();
      expect(cache.find(() => true)).toBeNull();
    });

    it("upsert() inserts new item when key missing", () => {
      const cache = makeCache();
      const result = cache.upsert({ id: "new", name: "New" });

      expect(result).toEqual({ id: "new", name: "New" });
      expect(cache.get("new")).toEqual({ id: "new", name: "New" });
    });

    it("upsert() merges partial into existing item", () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "u1", name: "Original", category: "cat1" }));

      const result = cache.upsert({ id: "u1", name: "Updated" });

      expect(result.name).toBe("Updated");
      expect(result.category).toBe("cat1");
    });

    it("reload() re-reads from disk", () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "mem-only" }));

      // Simulate disk file changing externally
      mockReadFileSync.mockReturnValue(JSON.stringify([makeItem({ id: "from-disk" })]));
      cache.reload();

      expect(cache.get("mem-only")).toBeNull();
      expect(cache.get("from-disk")).not.toBeNull();
    });

    it("flush() forces immediate write", async () => {
      const cache = makeCache();
      cache.set(makeItem());

      // Force flush without waiting for debounce
      await cache.flush();

      expect(mockFspWriteFile).toHaveBeenCalled();
    });

    it("atomic flush writes to .tmp then renames", async () => {
      const cache = makeCache();
      cache.set(makeItem({ id: "atom" }));

      vi.advanceTimersByTime(500);

      // Wait for the async flush
      await vi.advanceTimersByTimeAsync(0);

      expect(mockFspWriteFile).toHaveBeenCalledWith(
        "/tmp/test-cache.json.tmp",
        expect.any(String),
        "utf-8"
      );
      expect(mockFspRename).toHaveBeenCalledWith(
        "/tmp/test-cache.json.tmp",
        "/tmp/test-cache.json"
      );
    });
  });
});
