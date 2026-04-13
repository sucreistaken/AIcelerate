import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  editMessageSchema,
  reactMessageSchema,
  pinMessageSchema,
  sendLobbyMessageSchema,
} from "../messageSchemas";

describe("sendMessageSchema", () => {
  it("accepts valid message with defaults", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "Hello world",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("text");
    }
  });

  it("accepts all valid type values", () => {
    for (const type of ["text", "system", "file"]) {
      const result = sendMessageSchema.safeParse({
        serverId: "s-1",
        content: "msg",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid type", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "msg",
      type: "image",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 4000 chars", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "x".repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts content exactly 4000 chars", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "x".repeat(4000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty serverId", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "",
      content: "msg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing serverId", () => {
    const result = sendMessageSchema.safeParse({ content: "msg" });
    expect(result.success).toBe(false);
  });

  it("rejects missing content", () => {
    const result = sendMessageSchema.safeParse({ serverId: "s-1" });
    expect(result.success).toBe(false);
  });

  it("accepts optional embeds", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "msg",
      embeds: [{ url: "http://example.com" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional threadId", () => {
    const result = sendMessageSchema.safeParse({
      serverId: "s-1",
      content: "msg",
      threadId: "t-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("editMessageSchema", () => {
  it("accepts valid edit", () => {
    const result = editMessageSchema.safeParse({ content: "updated text" });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = editMessageSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 4000 chars", () => {
    const result = editMessageSchema.safeParse({ content: "y".repeat(4001) });
    expect(result.success).toBe(false);
  });

  it("accepts content exactly 4000 chars", () => {
    const result = editMessageSchema.safeParse({ content: "y".repeat(4000) });
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const result = editMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("reactMessageSchema", () => {
  it("accepts valid emoji", () => {
    const result = reactMessageSchema.safeParse({ emoji: "👍" });
    expect(result.success).toBe(true);
  });

  it("accepts short text emoji", () => {
    const result = reactMessageSchema.safeParse({ emoji: ":thumbsup:" });
    expect(result.success).toBe(true);
  });

  it("rejects empty emoji", () => {
    const result = reactMessageSchema.safeParse({ emoji: "" });
    expect(result.success).toBe(false);
  });

  it("rejects emoji longer than 20 chars", () => {
    const result = reactMessageSchema.safeParse({ emoji: "e".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("accepts emoji exactly 20 chars", () => {
    const result = reactMessageSchema.safeParse({ emoji: "e".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("rejects missing emoji", () => {
    const result = reactMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("pinMessageSchema", () => {
  it("accepts valid pin data", () => {
    const result = pinMessageSchema.safeParse({ serverId: "s-1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty serverId", () => {
    const result = pinMessageSchema.safeParse({ serverId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing serverId", () => {
    const result = pinMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("sendLobbyMessageSchema", () => {
  it("accepts valid lobby message", () => {
    const result = sendLobbyMessageSchema.safeParse({ content: "Hello lobby" });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = sendLobbyMessageSchema.safeParse({ content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects content longer than 2000 chars", () => {
    const result = sendLobbyMessageSchema.safeParse({ content: "z".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts content exactly 2000 chars", () => {
    const result = sendLobbyMessageSchema.safeParse({ content: "z".repeat(2000) });
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const result = sendLobbyMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
