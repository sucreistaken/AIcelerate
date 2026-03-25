import { describe, it, expect } from "vitest";
import { generateId, uid } from "../idGenerator";

describe("generateId", () => {
  it("generates a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it("includes prefix when provided", () => {
    const id = generateId("test");
    expect(id.startsWith("test-")).toBe(true);
  });

  it("has no prefix when not provided", () => {
    const id = generateId();
    expect(id.includes("-")).toBe(false);
  });
});

describe("uid", () => {
  it("generates a string", () => {
    expect(typeof uid()).toBe("string");
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("has reasonable length", () => {
    const id = uid();
    expect(id.length).toBeGreaterThan(5);
    expect(id.length).toBeLessThan(30);
  });
});
