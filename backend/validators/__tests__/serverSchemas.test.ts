import { describe, it, expect } from "vitest";
import {
  createServerSchema,
  updateServerSchema,
  joinByInviteSchema,
  kickSchema,
  addCategorySchema,
} from "../serverSchemas";

describe("createServerSchema", () => {
  it("accepts valid server with defaults", () => {
    const result = createServerSchema.safeParse({ name: "My Server" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  it("accepts server with all fields", () => {
    const result = createServerSchema.safeParse({
      name: "CS Study Server",
      description: "For CS students",
      iconColor: "#00ff00",
      tags: ["computer-science", "algorithms"],
      university: "Stanford",
      isPublic: true,
      templateId: "tmpl-2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createServerSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createServerSchema.safeParse({ name: "s".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 100 chars", () => {
    const result = createServerSchema.safeParse({ name: "s".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 500 chars", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      description: "d".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description exactly 500 chars", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      description: "d".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 10 tags", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 10 tags", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("rejects individual tag longer than 50 chars", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      tags: ["a".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects university longer than 100 chars", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      university: "u".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createServerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean isPublic", () => {
    const result = createServerSchema.safeParse({
      name: "Server",
      isPublic: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateServerSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateServerSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateServerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts settings record", () => {
    const result = updateServerSchema.safeParse({
      settings: { maxMembers: 100 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateServerSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = updateServerSchema.safeParse({ name: "n".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 chars", () => {
    const result = updateServerSchema.safeParse({ description: "d".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 tags", () => {
    const result = updateServerSchema.safeParse({
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts full update", () => {
    const result = updateServerSchema.safeParse({
      name: "New Name",
      description: "New desc",
      iconColor: "#000",
      tags: ["tag1"],
      university: "Harvard",
      settings: { key: "val" },
    });
    expect(result.success).toBe(true);
  });
});

describe("joinByInviteSchema (server)", () => {
  it("accepts valid invite code", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "inv123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty invite code", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invite code longer than 20 chars", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "i".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("accepts invite code exactly 20 chars", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "i".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("rejects missing inviteCode", () => {
    const result = joinByInviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("kickSchema (server)", () => {
  it("accepts valid targetId", () => {
    const result = kickSchema.safeParse({ targetId: "user-789" });
    expect(result.success).toBe(true);
  });

  it("rejects empty targetId", () => {
    const result = kickSchema.safeParse({ targetId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing targetId", () => {
    const result = kickSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("addCategorySchema (server)", () => {
  it("accepts valid category name", () => {
    const result = addCategorySchema.safeParse({ name: "General" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = addCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = addCategorySchema.safeParse({ name: "c".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 100 chars", () => {
    const result = addCategorySchema.safeParse({ name: "c".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = addCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
