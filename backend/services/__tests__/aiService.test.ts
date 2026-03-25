import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock env to avoid process.exit on missing GEMINI_API_KEY
vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key" },
}));

import { stripCodeFences, tryParseJSON } from "../aiService";

describe("stripCodeFences", () => {
  it("removes ```json fences", () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("removes plain ``` fences", () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripCodeFences(input)).toBe('{"key": "value"}');
  });

  it("trims whitespace", () => {
    expect(stripCodeFences("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(stripCodeFences("")).toBe("");
  });

  it("handles string with no fences", () => {
    expect(stripCodeFences('{"a": 1}')).toBe('{"a": 1}');
  });
});

describe("tryParseJSON", () => {
  it("parses valid JSON", () => {
    expect(tryParseJSON('{"key": "value"}')).toEqual({ key: "value" });
  });

  it("parses JSON array", () => {
    expect(tryParseJSON("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns null for invalid JSON", () => {
    expect(tryParseJSON("not json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseJSON("")).toBeNull();
  });

  it("parses nested objects", () => {
    const input = '{"a": {"b": [1, 2]}}';
    expect(tryParseJSON(input)).toEqual({ a: { b: [1, 2] } });
  });
});
