import { describe, it, expect } from "vitest";
import { generateId, uid } from "../idGenerator";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

  it("returns a valid UUID when no prefix", () => {
    const id = generateId();
    expect(UUID_REGEX.test(id)).toBe(true);
  });

  it("contains a valid UUID after prefix", () => {
    const id = generateId("lec");
    const uuidPart = id.slice("lec-".length);
    expect(UUID_REGEX.test(uuidPart)).toBe(true);
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

  it("returns a valid UUID", () => {
    const id = uid();
    expect(UUID_REGEX.test(id)).toBe(true);
  });
});
