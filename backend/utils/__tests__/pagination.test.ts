import { describe, it, expect } from "vitest";
import {
  clampLimit,
  buildPaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../pagination";

describe("clampLimit", () => {
  it("returns default page size for undefined", () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("returns default for NaN", () => {
    expect(clampLimit(NaN)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("returns default for Infinity", () => {
    expect(clampLimit(Infinity)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("returns default for negative Infinity", () => {
    expect(clampLimit(-Infinity)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("returns default for negative numbers", () => {
    expect(clampLimit(-1)).toBe(DEFAULT_PAGE_SIZE);
    expect(clampLimit(-100)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("returns default for zero", () => {
    expect(clampLimit(0)).toBe(DEFAULT_PAGE_SIZE);
  });

  it("clamps to max page size for large numbers", () => {
    expect(clampLimit(500)).toBe(MAX_PAGE_SIZE);
    expect(clampLimit(101)).toBe(MAX_PAGE_SIZE);
    expect(clampLimit(1000)).toBe(MAX_PAGE_SIZE);
  });

  it("returns valid numbers as-is within range", () => {
    expect(clampLimit(1)).toBe(1);
    expect(clampLimit(10)).toBe(10);
    expect(clampLimit(50)).toBe(50);
    expect(clampLimit(100)).toBe(100);
  });

  it("returns exact MAX_PAGE_SIZE when given MAX_PAGE_SIZE", () => {
    expect(clampLimit(MAX_PAGE_SIZE)).toBe(MAX_PAGE_SIZE);
  });
});

describe("buildPaginatedResult", () => {
  it("returns empty result for null array", () => {
    const result = buildPaginatedResult(null as any, 10);
    expect(result).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it("returns empty result for empty array", () => {
    const result = buildPaginatedResult([], 10);
    expect(result).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  it("returns items without cursor when no more pages", () => {
    const items = [
      { id: "1", name: "a" },
      { id: "2", name: "b" },
      { id: "3", name: "c" },
    ];
    const result = buildPaginatedResult(items, 5);

    expect(result.items).toEqual(items);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("returns items without cursor when exactly at limit", () => {
    const items = [
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ];
    const result = buildPaginatedResult(items, 2);

    expect(result.items).toEqual(items);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("returns nextCursor and hasMore when more items exist", () => {
    // Fetch limit+1 items to detect hasMore
    const items = [
      { id: "a1", name: "first" },
      { id: "a2", name: "second" },
      { id: "a3", name: "third" },
    ];
    const result = buildPaginatedResult(items, 2);

    expect(result.items).toHaveLength(2);
    expect(result.items).toEqual([
      { id: "a1", name: "first" },
      { id: "a2", name: "second" },
    ]);
    expect(result.nextCursor).toBe("a2");
    expect(result.hasMore).toBe(true);
  });

  it("handles single-item arrays", () => {
    const items = [{ id: "only", value: 42 }];
    const result = buildPaginatedResult(items, 10);

    expect(result.items).toEqual([{ id: "only", value: 42 }]);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("uses _id.toString() when id is not present", () => {
    const items = [
      { _id: { toString: () => "mongo-1" }, name: "a" },
      { _id: { toString: () => "mongo-2" }, name: "b" },
      { _id: { toString: () => "mongo-3" }, name: "c" },
    ];
    const result = buildPaginatedResult(items, 2);

    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("mongo-2");
    expect(result.items).toHaveLength(2);
  });

  it("prefers id over _id", () => {
    const items = [
      { id: "preferred", _id: { toString: () => "fallback" }, name: "a" },
      { id: "preferred-2", _id: { toString: () => "fallback-2" }, name: "b" },
    ];
    // 1 item with hasMore, so limit = 1
    const result = buildPaginatedResult(items, 1);

    expect(result.nextCursor).toBe("preferred");
  });
});
