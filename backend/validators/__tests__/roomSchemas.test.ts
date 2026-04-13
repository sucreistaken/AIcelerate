import { describe, it, expect } from "vitest";
import {
  createRoomSchema,
  createSoloRoomSchema,
  updateRoomSchema,
  updateTopicSchema,
  joinByInviteSchema,
  kickSchema,
  transferOwnershipSchema,
  setMaterialSchema,
  addCategorySchema,
} from "../roomSchemas";

describe("createRoomSchema", () => {
  it("accepts valid room with defaults", () => {
    const result = createRoomSchema.safeParse({ name: "Study Group" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  it("accepts room with all fields", () => {
    const result = createRoomSchema.safeParse({
      name: "Study Room",
      description: "A room for studying",
      iconColor: "#ff0000",
      tags: ["math", "science"],
      university: "MIT",
      isPublic: true,
      templateId: "tmpl-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createRoomSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createRoomSchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts name exactly 100 chars", () => {
    const result = createRoomSchema.safeParse({ name: "a".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects description longer than 500 chars", () => {
    const result = createRoomSchema.safeParse({
      name: "Room",
      description: "d".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 tags", () => {
    const result = createRoomSchema.safeParse({
      name: "Room",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 10 tags", () => {
    const result = createRoomSchema.safeParse({
      name: "Room",
      tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("rejects tag longer than 50 chars", () => {
    const result = createRoomSchema.safeParse({
      name: "Room",
      tags: ["t".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects university longer than 100 chars", () => {
    const result = createRoomSchema.safeParse({
      name: "Room",
      university: "u".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createRoomSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("createSoloRoomSchema", () => {
  it("accepts valid solo room", () => {
    const result = createSoloRoomSchema.safeParse({ name: "My Solo Room" });
    expect(result.success).toBe(true);
  });

  it("accepts with optional fields", () => {
    const result = createSoloRoomSchema.safeParse({
      name: "Solo",
      topic: "Math study",
      templateId: "t-1",
      tags: ["calc"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createSoloRoomSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects topic longer than 200 chars", () => {
    const result = createSoloRoomSchema.safeParse({
      name: "Room",
      topic: "t".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts topic exactly 200 chars", () => {
    const result = createSoloRoomSchema.safeParse({
      name: "Room",
      topic: "t".repeat(200),
    });
    expect(result.success).toBe(true);
  });
});

describe("updateRoomSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateRoomSchema.safeParse({ name: "Updated Room" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateRoomSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts settings record", () => {
    const result = updateRoomSchema.safeParse({
      settings: { maxMembers: 10, allowGuests: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateRoomSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 chars", () => {
    const result = updateRoomSchema.safeParse({ description: "d".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 tags", () => {
    const result = updateRoomSchema.safeParse({
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts isPublic boolean", () => {
    expect(updateRoomSchema.safeParse({ isPublic: true }).success).toBe(true);
    expect(updateRoomSchema.safeParse({ isPublic: false }).success).toBe(true);
  });
});

describe("updateTopicSchema", () => {
  it("accepts valid topic", () => {
    const result = updateTopicSchema.safeParse({ topic: "New topic" });
    expect(result.success).toBe(true);
  });

  it("rejects empty topic", () => {
    const result = updateTopicSchema.safeParse({ topic: "" });
    expect(result.success).toBe(false);
  });

  it("rejects topic longer than 200 chars", () => {
    const result = updateTopicSchema.safeParse({ topic: "t".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects missing topic", () => {
    const result = updateTopicSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("joinByInviteSchema", () => {
  it("accepts valid invite code", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "abc123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty invite code", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invite code longer than 20 chars", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "x".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("accepts invite code exactly 20 chars", () => {
    const result = joinByInviteSchema.safeParse({ inviteCode: "x".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("rejects missing inviteCode", () => {
    const result = joinByInviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("kickSchema", () => {
  it("accepts valid targetId", () => {
    const result = kickSchema.safeParse({ targetId: "user-123" });
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

describe("transferOwnershipSchema", () => {
  it("accepts valid newOwnerId", () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: "user-456" });
    expect(result.success).toBe(true);
  });

  it("rejects empty newOwnerId", () => {
    const result = transferOwnershipSchema.safeParse({ newOwnerId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing newOwnerId", () => {
    const result = transferOwnershipSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("setMaterialSchema", () => {
  it("accepts valid materialId", () => {
    const result = setMaterialSchema.safeParse({ materialId: "mat-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty materialId", () => {
    const result = setMaterialSchema.safeParse({ materialId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing materialId", () => {
    const result = setMaterialSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("addCategorySchema", () => {
  it("accepts valid name", () => {
    const result = addCategorySchema.safeParse({ name: "Homework" });
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

  it("rejects missing name", () => {
    const result = addCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
