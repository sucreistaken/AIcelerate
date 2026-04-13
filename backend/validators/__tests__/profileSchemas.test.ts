import { describe, it, expect } from "vitest";
import {
  createProfileSchema,
  updateProfileSchema,
  setStatusSchema,
  friendRequestSchema,
  friendActionSchema,
} from "../profileSchemas";

describe("createProfileSchema", () => {
  it("accepts valid profile", () => {
    const result = createProfileSchema.safeParse({ nickname: "Nick" });
    expect(result.success).toBe(true);
  });

  it("accepts profile with avatar", () => {
    const result = createProfileSchema.safeParse({
      nickname: "Nick",
      avatar: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects nickname shorter than 2 chars", () => {
    const result = createProfileSchema.safeParse({ nickname: "A" });
    expect(result.success).toBe(false);
  });

  it("accepts nickname exactly 2 chars", () => {
    const result = createProfileSchema.safeParse({ nickname: "AB" });
    expect(result.success).toBe(true);
  });

  it("rejects nickname longer than 32 chars", () => {
    const result = createProfileSchema.safeParse({ nickname: "N".repeat(33) });
    expect(result.success).toBe(false);
  });

  it("accepts nickname exactly 32 chars", () => {
    const result = createProfileSchema.safeParse({ nickname: "N".repeat(32) });
    expect(result.success).toBe(true);
  });

  it("rejects missing nickname", () => {
    const result = createProfileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty nickname", () => {
    const result = createProfileSchema.safeParse({ nickname: "" });
    expect(result.success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateProfileSchema.safeParse({ nickname: "NewNick" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts bio update", () => {
    const result = updateProfileSchema.safeParse({ bio: "Hello there" });
    expect(result.success).toBe(true);
  });

  it("rejects bio longer than 500 chars", () => {
    const result = updateProfileSchema.safeParse({ bio: "b".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("accepts bio exactly 500 chars", () => {
    const result = updateProfileSchema.safeParse({ bio: "b".repeat(500) });
    expect(result.success).toBe(true);
  });

  it("rejects nickname shorter than 2 chars when provided", () => {
    const result = updateProfileSchema.safeParse({ nickname: "X" });
    expect(result.success).toBe(false);
  });

  it("rejects nickname longer than 32 chars when provided", () => {
    const result = updateProfileSchema.safeParse({ nickname: "X".repeat(33) });
    expect(result.success).toBe(false);
  });

  it("accepts avatar update", () => {
    const result = updateProfileSchema.safeParse({ avatar: "https://img.com/a.jpg" });
    expect(result.success).toBe(true);
  });
});

describe("setStatusSchema", () => {
  it("accepts all valid status values", () => {
    for (const status of ["online", "idle", "dnd", "offline"]) {
      const result = setStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(setStatusSchema.safeParse({ status: "away" }).success).toBe(false);
    expect(setStatusSchema.safeParse({ status: "busy" }).success).toBe(false);
    expect(setStatusSchema.safeParse({ status: "" }).success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = setStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("friendRequestSchema", () => {
  it("accepts valid friend code", () => {
    const result = friendRequestSchema.safeParse({ friendCode: "ABC123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty friend code", () => {
    const result = friendRequestSchema.safeParse({ friendCode: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing friendCode", () => {
    const result = friendRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("friendActionSchema", () => {
  it("accepts valid fromId", () => {
    const result = friendActionSchema.safeParse({ fromId: "user-123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty fromId", () => {
    const result = friendActionSchema.safeParse({ fromId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fromId", () => {
    const result = friendActionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
