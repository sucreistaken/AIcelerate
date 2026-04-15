import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock channelService
const mockTouchLastMessage = vi.fn();
vi.mock("../channelService", () => ({
  channelService: {
    touchLastMessage: (...args: any[]) => mockTouchLastMessage(...args),
    togglePin: vi.fn(),
  },
}));

// Mock eventBus
const mockEmit = vi.fn();
vi.mock("../../events/eventBus", () => ({
  eventBus: { emit: (...args: any[]) => mockEmit(...args) },
}));

// Mock mongoose-plugins
vi.mock("../../config/mongoose-plugins", () => ({
  leanArrayToId: vi.fn((docs: any[]) =>
    docs.map((d: any) => {
      const r = { ...d, id: (d._id || d.id || "").toString() };
      delete r._id;
      return r;
    })
  ),
}));

// Mock middleware error helpers (import actual implementations for assertion)
vi.mock("../../middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    constructor(public statusCode: number, message: string, public code?: string) {
      super(message);
      this.name = "AppError";
    }
  },
  badRequest: (msg: string) => {
    const e = new Error(msg);
    (e as any).statusCode = 400;
    (e as any).code = "BAD_REQUEST";
    return e;
  },
  notFound: (msg: string) => {
    const e = new Error(msg);
    (e as any).statusCode = 404;
    (e as any).code = "NOT_FOUND";
    return e;
  },
  forbidden: (msg: string) => {
    const e = new Error(msg);
    (e as any).statusCode = 403;
    (e as any).code = "FORBIDDEN";
    return e;
  },
}));

// ---------- Message model mock ----------
const mockCreate = vi.fn();
const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockCountDocuments = vi.fn();

vi.mock("../../models/Message", () => ({
  Message: {
    create: (...args: any[]) => mockCreate(...args),
    find: (...args: any[]) => mockFind(...args),
    findOne: (...args: any[]) => mockFindOne(...args),
    findById: (...args: any[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    countDocuments: (...args: any[]) => mockCountDocuments(...args),
  },
}));

import { messageService } from "../messageService";

// ---------- Chainable query helper ----------

/** Creates an object that supports .select()/.lean()/.sort()/.collation() chaining and is awaitable */
function chainable(val: any) {
  const obj: any = {};
  obj.select = vi.fn().mockReturnValue(obj);
  obj.lean = vi.fn().mockReturnValue(obj);
  obj.collation = vi.fn().mockReturnValue(obj);
  obj.sort = vi.fn().mockReturnValue(obj);
  obj.then = (resolve: any, reject?: any) => Promise.resolve(val).then(resolve, reject);
  return obj;
}

// ---------- Helpers ----------

function makeMsg(overrides: Record<string, any> = {}) {
  return {
    _id: "msg-1",
    channelId: "ch-1",
    roomId: "room-1",
    authorId: "user-1",
    content: "Hello world",
    type: "text",
    embeds: [],
    mentions: [],
    reactions: [],
    pinned: false,
    edited: false,
    deleted: false,
    replyCount: 0,
    threadId: undefined,
    toJSON() {
      return { ...this };
    },
    ...overrides,
  };
}

describe("messageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── send() ──────────────────────────────────────────────────────────

  describe("send()", () => {
    it("creates message with correct fields", async () => {
      const created = makeMsg();
      mockCreate.mockResolvedValue(created);
      mockTouchLastMessage.mockResolvedValue(undefined);

      const result = await messageService.send("ch-1", "room-1", "user-1", "Hello world");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          channelId: "ch-1",
          roomId: "room-1",
          authorId: "user-1",
          content: "Hello world",
          type: "text",
          embeds: [],
        })
      );
      expect(result.content).toBe("Hello world");
      expect(mockTouchLastMessage).toHaveBeenCalledWith("room-1", "ch-1");
      expect(mockEmit).toHaveBeenCalledWith("message:sent", expect.objectContaining({ channelId: "ch-1" }));
    });

    it("throws on empty content for text type", async () => {
      await expect(messageService.send("ch-1", "room-1", "user-1", "")).rejects.toThrow(
        "Message content cannot be empty"
      );
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("throws on whitespace-only content for text type", async () => {
      await expect(messageService.send("ch-1", "room-1", "user-1", "   ")).rejects.toThrow(
        "Message content cannot be empty"
      );
    });

    it("increments parent replyCount when threadId provided", async () => {
      const created = makeMsg({ threadId: "parent-1" });
      mockCreate.mockResolvedValue(created);
      mockFindByIdAndUpdate.mockResolvedValue(null);
      mockTouchLastMessage.mockResolvedValue(undefined);

      await messageService.send("ch-1", "room-1", "user-1", "Reply text", "text", [], "parent-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith("parent-1", { $inc: { replyCount: 1 } });
    });

    it("does not increment replyCount when no threadId", async () => {
      const created = makeMsg();
      mockCreate.mockResolvedValue(created);
      mockTouchLastMessage.mockResolvedValue(undefined);

      await messageService.send("ch-1", "room-1", "user-1", "Simple message");

      // findByIdAndUpdate should NOT have been called for replyCount
      expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("parses mentions from content", async () => {
      const created = makeMsg({ mentions: ["john", "jane"] });
      mockCreate.mockResolvedValue(created);
      mockTouchLastMessage.mockResolvedValue(undefined);

      await messageService.send("ch-1", "room-1", "user-1", "Hey @john and @jane");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mentions: expect.arrayContaining(["john", "jane"]),
        })
      );
    });
  });

  // ── getMessages() ───────────────────────────────────────────────────

  describe("getMessages()", () => {
    it("returns messages sorted by createdAt desc then reversed", async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: "m2", content: "Second", channelId: "ch-1" },
          { _id: "m1", content: "First", channelId: "ch-1" },
        ]),
      };
      mockFind.mockReturnValue(chainMock);

      const result = await messageService.getMessages("ch-1");

      expect(mockFind).toHaveBeenCalledWith({ channelId: "ch-1", deleted: false });
      expect(chainMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chainMock.limit).toHaveBeenCalledWith(50);
      // leanArrayToId is called then .reverse(), so order is reversed
      expect(result[0].id).toBe("m1");
      expect(result[1].id).toBe("m2");
    });

    it("applies before cursor filter by _id", async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      mockFind.mockReturnValue(chainMock);

      await messageService.getMessages("ch-1", 25, "cursor-id");

      expect(mockFind).toHaveBeenCalledWith({
        channelId: "ch-1",
        deleted: false,
        _id: { $lt: "cursor-id" },
      });
      expect(chainMock.limit).toHaveBeenCalledWith(25);
    });

    it("uses default limit of 50", async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      mockFind.mockReturnValue(chainMock);

      await messageService.getMessages("ch-1");

      expect(chainMock.limit).toHaveBeenCalledWith(50);
    });
  });

  // ── edit() ──────────────────────────────────────────────────────────

  describe("edit()", () => {
    it("updates content and sets edited flag", async () => {
      const msg = makeMsg({ authorId: "user-1" });
      mockFindOne.mockReturnValue(chainable(msg));
      const updatedMsg = makeMsg({ content: "Updated", edited: true });
      mockFindByIdAndUpdate.mockResolvedValue(updatedMsg);

      const result = await messageService.edit("ch-1", "msg-1", "user-1", "Updated");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "msg-1",
        {
          $set: {
            content: "Updated",
            mentions: [],
            edited: true,
          },
        },
        { returnDocument: 'after' }
      );
      expect(result.edited).toBe(true);
    });

    it("throws forbidden when userId doesn't match author", async () => {
      const msg = makeMsg({ authorId: "user-1" });
      mockFindOne.mockReturnValue(chainable(msg));

      await expect(
        messageService.edit("ch-1", "msg-1", "other-user", "Updated")
      ).rejects.toThrow("Can only edit your own messages");
    });

    it("throws notFound when message doesn't exist", async () => {
      mockFindOne.mockReturnValue(chainable(null));

      await expect(
        messageService.edit("ch-1", "msg-999", "user-1", "Updated")
      ).rejects.toThrow("Message not found");
    });

    it("throws badRequest when message is deleted", async () => {
      const msg = makeMsg({ authorId: "user-1", deleted: true });
      mockFindOne.mockReturnValue(chainable(msg));

      await expect(
        messageService.edit("ch-1", "msg-1", "user-1", "Updated")
      ).rejects.toThrow("Cannot edit deleted message");
    });
  });

  // ── delete() ────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("soft-deletes by setting deleted true and content empty", async () => {
      const msg = makeMsg({ authorId: "user-1" });
      mockFindOne.mockReturnValue(chainable(msg));
      mockFindByIdAndUpdate.mockResolvedValue(null);

      await messageService.delete("ch-1", "msg-1", "user-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith("msg-1", {
        $set: { deleted: true, content: "" },
      });
      expect(mockEmit).toHaveBeenCalledWith("message:deleted", { channelId: "ch-1", messageId: "msg-1" });
    });

    it("decrements parent replyCount when thread reply", async () => {
      const msg = makeMsg({ authorId: "user-1", threadId: "parent-1" });
      mockFindOne.mockReturnValue(chainable(msg));
      mockFindByIdAndUpdate.mockResolvedValue(null);

      await messageService.delete("ch-1", "msg-1", "user-1");

      // First call: soft delete, second call: decrement replyCount
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith("parent-1", { $inc: { replyCount: -1 } });
    });

    it("throws forbidden when userId doesn't match (non-admin)", async () => {
      const msg = makeMsg({ authorId: "user-1" });
      mockFindOne.mockReturnValue(chainable(msg));

      await expect(
        messageService.delete("ch-1", "msg-1", "other-user", false)
      ).rejects.toThrow("Can only delete your own messages");
    });

    it("allows admin to delete any message", async () => {
      const msg = makeMsg({ authorId: "user-1" });
      mockFindOne.mockReturnValue(chainable(msg));
      mockFindByIdAndUpdate.mockResolvedValue(null);

      // Should not throw even though userId doesn't match
      await messageService.delete("ch-1", "msg-1", "admin-user", true);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith("msg-1", {
        $set: { deleted: true, content: "" },
      });
    });

    it("throws notFound when message doesn't exist", async () => {
      mockFindOne.mockReturnValue(chainable(null));

      await expect(
        messageService.delete("ch-1", "msg-999", "user-1")
      ).rejects.toThrow("Message not found");
    });
  });

  // ── react() ─────────────────────────────────────────────────────────

  describe("react()", () => {
    it("adds new reaction with userId when emoji doesn't exist", async () => {
      const msg = makeMsg({ reactions: [] });
      mockFindOne.mockReturnValue(chainable(msg));
      const updatedMsg = makeMsg({ reactions: [{ emoji: "thumbsup", userIds: ["user-1"] }] });
      mockFindByIdAndUpdate.mockResolvedValue(updatedMsg);

      const result = await messageService.react("ch-1", "msg-1", "thumbsup", "user-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "msg-1",
        { $push: { reactions: { emoji: "thumbsup", userIds: ["user-1"] } } },
        { returnDocument: 'after' }
      );
      expect(result).toBeDefined();
    });

    it("removes userId from existing reaction (toggle off)", async () => {
      const msg = makeMsg({
        reactions: [{ emoji: "thumbsup", userIds: ["user-1", "user-2"] }],
      });
      mockFindOne.mockReturnValue(chainable(msg));

      const afterPull = makeMsg({ reactions: [{ emoji: "thumbsup", userIds: ["user-2"] }] });
      mockFindOneAndUpdate.mockResolvedValue(afterPull);
      mockFindByIdAndUpdate.mockResolvedValue(null); // cleanup empty
      mockFindById.mockResolvedValue(afterPull);

      const result = await messageService.react("ch-1", "msg-1", "thumbsup", "user-1");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "msg-1", "reactions.emoji": "thumbsup" },
        { $pull: { "reactions.$.userIds": "user-1" } },
        { returnDocument: 'after' }
      );
      expect(result).toBeDefined();
    });

    it("adds userId to existing reaction when user hasn't reacted", async () => {
      const msg = makeMsg({
        reactions: [{ emoji: "thumbsup", userIds: ["user-2"] }],
      });
      mockFindOne.mockReturnValue(chainable(msg));
      const updatedMsg = makeMsg({
        reactions: [{ emoji: "thumbsup", userIds: ["user-2", "user-1"] }],
      });
      mockFindOneAndUpdate.mockResolvedValue(updatedMsg);

      const result = await messageService.react("ch-1", "msg-1", "thumbsup", "user-1");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "msg-1", "reactions.emoji": "thumbsup" },
        { $addToSet: { "reactions.$.userIds": "user-1" } },
        { returnDocument: 'after' }
      );
      expect(result).toBeDefined();
    });

    it("throws notFound for missing message", async () => {
      mockFindOne.mockReturnValue(chainable(null));

      await expect(
        messageService.react("ch-1", "msg-999", "thumbsup", "user-1")
      ).rejects.toThrow("Message not found");
    });
  });

  // ── pin() ───────────────────────────────────────────────────────────

  describe("pin()", () => {
    it("toggles pin state from false to true", async () => {
      const msg = makeMsg({ pinned: false });
      mockFindOne.mockReturnValue(chainable(msg));
      const pinnedMsg = makeMsg({ pinned: true });
      mockFindByIdAndUpdate.mockResolvedValue(pinnedMsg);

      const result = await messageService.pin("ch-1", "room-1", "msg-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "msg-1",
        { $set: { pinned: true } },
        { returnDocument: 'after' }
      );
      expect(result.pinned).toBe(true);
    });

    it("toggles pin state from true to false", async () => {
      const msg = makeMsg({ pinned: true });
      mockFindOne.mockReturnValue(chainable(msg));
      const unpinnedMsg = makeMsg({ pinned: false });
      mockFindByIdAndUpdate.mockResolvedValue(unpinnedMsg);

      const result = await messageService.pin("ch-1", "room-1", "msg-1");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "msg-1",
        { $set: { pinned: false } },
        { returnDocument: 'after' }
      );
      expect(result.pinned).toBe(false);
    });

    it("throws notFound for missing message", async () => {
      mockFindOne.mockReturnValue(chainable(null));

      await expect(
        messageService.pin("ch-1", "room-1", "msg-999")
      ).rejects.toThrow("Message not found");
    });
  });
});
