import { describe, it, expect } from "vitest";
import { smartTruncate } from "../smartTruncate";

describe("smartTruncate", () => {
  it("returns short text unchanged", () => {
    expect(smartTruncate("hello", 100)).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(smartTruncate("", 100)).toBe("");
    expect(smartTruncate(null as any, 100)).toBe("");
  });

  it("truncates long text to approximate maxChars", () => {
    const text = "A".repeat(10000);
    const result = smartTruncate(text, 5000);
    // Allow some slack for separators
    expect(result.length).toBeLessThanOrEqual(5100);
    expect(result.length).toBeGreaterThan(4800);
  });

  it("preserves beginning, middle, and end of text", () => {
    const text = "START_" + "x".repeat(5000) + "_MIDDLE_" + "y".repeat(5000) + "_END";
    const result = smartTruncate(text, 2000);
    expect(result).toContain("START_");
    expect(result).toContain("_END");
    expect(result).toContain("[... content trimmed ...]");
  });

  it("falls back to simple slice for very small maxChars", () => {
    const text = "A".repeat(500);
    const result = smartTruncate(text, 50);
    expect(result.length).toBe(50);
    expect(result).toBe("A".repeat(50));
  });

  it("handles text exactly at maxChars", () => {
    const text = "A".repeat(1000);
    expect(smartTruncate(text, 1000)).toBe(text);
  });

  it("includes content from the end of the text", () => {
    // This is the key improvement over .slice(0, N)
    const text = "intro ".repeat(100) + "IMPORTANT_CONCLUSION";
    const result = smartTruncate(text, 200);
    expect(result).toContain("IMPORTANT_CONCLUSION");
  });
});
