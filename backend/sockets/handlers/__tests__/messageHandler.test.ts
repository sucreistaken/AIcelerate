import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock logger ─────────────────────────────────────────────────────────────
vi.mock("../../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Mock messageService ─────────────────────────────────────────────────────
const mockSend = vi.fn();
const mockEdit = vi.fn();
const mockDelete = vi.fn();
const mockReact = vi.fn();
const mockPin = vi.fn();

vi.mock("../../../services/messageService", () => ({
  messageService: {
    send: (...args: any[]) => mockSend(...args),
    edit: (...args: any[]) => mockEdit(...args),
    delete: (...args: any[]) => mockDelete(...args),
    react: (...args: any[]) => mockReact(...args),
    pin: (...args: any[]) => mockPin(...args),
  },
}));

// ── Mock roomService ────────────────────────────────────────────────────────
const mockGetById = vi.fn();

vi.mock("../../../services/roomService", () => ({
  roomService: {
    getById: (...args: any[]) => mockGetById(...args),
  },
}));

// ── Mock rateLimiter ────────────────────────────────────────────────────────
const mockCheckSocketRateLimit = vi.fn().mockReturnValue(true);

vi.mock("../../../middleware/rateLimiter", () => ({
  checkSocketRateLimit: (...args: any[]) => mockCheckSocketRateLimit(...args),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { registerMessageHandlers } from "../messageHandler";

// ── Helpers ─────────────────────────────────────────────────────────────────

type SocketHandler = (data: unknown, cb: (...args: any[]) => void) => void;

function createMockSocket() {
  const handlers = new Map<string, SocketHandler>();
  return {
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    join: vi.fn(),
    _getHandler(event: string): SocketHandler | undefined {
      return handlers.get(event);
    },
  };
}

function createMockNamespace() {
  const emitFn = vi.fn();
  const toResult = { emit: emitFn };
  return {
    to: vi.fn().mockReturnValue(toResult),
    emit: emitFn,
    _toEmit: emitFn,
  };
}

function makeMessage(overrides: Record<string, any> = {}) {
  return {
    _id: "msg-1",
    channelId: "ch-1",
    serverId: "srv-1",
    authorId: "user-1",
    content: "Hello world",
    type: "text",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("registerMessageHandlers", () => {
  let socket: ReturnType<typeof createMockSocket>;
  let collab: ReturnType<typeof createMockNamespace>;
  let getUserId: ReturnType<typeof vi.fn>;
  let verifyChannelMember: ReturnType<typeof vi.fn>;
  let clearTyping: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default after clearAllMocks resets return values
    mockCheckSocketRateLimit.mockReturnValue(true);

    socket = createMockSocket();
    collab = createMockNamespace();
    getUserId = vi.fn().mockReturnValue("user-1");
    verifyChannelMember = vi.fn().mockResolvedValue(true);
    clearTyping = vi.fn();

    registerMessageHandlers(
      socket as any,
      collab as any,
      getUserId,
      verifyChannelMember,
      clearTyping
    );
  });

  // ── msg:send ──────────────────────────────────────────────────────────

  describe("msg:send", () => {
    const validData = {
      channelId: "ch-1",
      serverId: "srv-1",
      content: "Hello world",
    };

    it("successfully sends a message", async () => {
      const msg = makeMessage();
      mockGetById.mockResolvedValue({ memberIds: ["user-1", "user-2"] });
      mockSend.mockResolvedValue(msg);
      const cb = vi.fn();

      const handler = socket._getHandler("msg:send")!;
      await handler(validData, cb);

      expect(mockSend).toHaveBeenCalledWith("ch-1", "srv-1", "user-1", "Hello world", "text", [], undefined);
      expect(collab.to).toHaveBeenCalledWith("channel:ch-1");
      expect(collab._toEmit).toHaveBeenCalledWith("msg:new", msg);
      expect(clearTyping).toHaveBeenCalledWith("ch-1", "user-1", collab);
      expect(cb).toHaveBeenCalledWith({ ok: true, message: msg });
    });

    it("broadcasts channel activity to server room", async () => {
      const msg = makeMessage();
      mockGetById.mockResolvedValue({ memberIds: ["user-1"] });
      mockSend.mockResolvedValue(msg);
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(collab.to).toHaveBeenCalledWith("server:srv-1");
      expect(collab._toEmit).toHaveBeenCalledWith("channel:activity", {
        channelId: "ch-1",
        lastMessageAt: msg.createdAt,
        preview: "Hello world",
      });
    });

    it("returns error when not authenticated", async () => {
      getUserId.mockReturnValue(null);
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not authenticated" });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns error when rate limited", async () => {
      mockCheckSocketRateLimit.mockReturnValue(false);
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Rate limited" });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns error when not a server member", async () => {
      mockGetById.mockResolvedValue({ memberIds: ["other-user"] });
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not a member of this server" });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns error when not a channel member", async () => {
      mockGetById.mockResolvedValue({ memberIds: ["user-1"] });
      verifyChannelMember.mockResolvedValue(false);
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not a member of this channel" });
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns error on service exception", async () => {
      mockGetById.mockResolvedValue({ memberIds: ["user-1"] });
      mockSend.mockRejectedValue(new Error("DB down"));
      const cb = vi.fn();

      await socket._getHandler("msg:send")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "DB down" });
    });

    it("rejects invalid data (missing content)", async () => {
      const cb = vi.fn();

      await socket._getHandler("msg:send")!({ channelId: "ch-1", serverId: "srv-1" }, cb);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, error: expect.stringContaining("Validation failed") })
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("passes threadId when provided", async () => {
      const msg = makeMessage();
      mockGetById.mockResolvedValue({ memberIds: ["user-1"] });
      mockSend.mockResolvedValue(msg);
      const cb = vi.fn();

      await socket._getHandler("msg:send")!({
        ...validData,
        threadId: "thread-1",
      }, cb);

      expect(mockSend).toHaveBeenCalledWith(
        "ch-1", "srv-1", "user-1", "Hello world", "text", [], "thread-1"
      );
    });
  });

  // ── msg:edit ──────────────────────────────────────────────────────────

  describe("msg:edit", () => {
    const validData = {
      channelId: "ch-1",
      messageId: "msg-1",
      content: "Edited content",
    };

    it("successfully edits a message", async () => {
      const msg = makeMessage({ content: "Edited content" });
      mockEdit.mockResolvedValue(msg);
      const cb = vi.fn();

      await socket._getHandler("msg:edit")!(validData, cb);

      expect(mockEdit).toHaveBeenCalledWith("ch-1", "msg-1", "user-1", "Edited content");
      expect(collab.to).toHaveBeenCalledWith("channel:ch-1");
      expect(collab._toEmit).toHaveBeenCalledWith("msg:edited", msg);
      expect(cb).toHaveBeenCalledWith({ ok: true, message: msg });
    });

    it("returns error when not authenticated", async () => {
      getUserId.mockReturnValue(null);
      const cb = vi.fn();

      await socket._getHandler("msg:edit")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not authenticated" });
    });

    it("returns error when not a channel member", async () => {
      verifyChannelMember.mockResolvedValue(false);
      const cb = vi.fn();

      await socket._getHandler("msg:edit")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not a member of this channel" });
    });

    it("returns error on service exception", async () => {
      mockEdit.mockRejectedValue(new Error("Not found"));
      const cb = vi.fn();

      await socket._getHandler("msg:edit")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not found" });
    });
  });

  // ── msg:delete ────────────────────────────────────────────────────────

  describe("msg:delete", () => {
    const validData = {
      channelId: "ch-1",
      messageId: "msg-1",
    };

    it("successfully deletes a message", async () => {
      mockDelete.mockResolvedValue(undefined);
      const cb = vi.fn();

      await socket._getHandler("msg:delete")!(validData, cb);

      expect(mockDelete).toHaveBeenCalledWith("ch-1", "msg-1", "user-1");
      expect(collab.to).toHaveBeenCalledWith("channel:ch-1");
      expect(collab._toEmit).toHaveBeenCalledWith("msg:deleted", {
        channelId: "ch-1",
        messageId: "msg-1",
      });
      expect(cb).toHaveBeenCalledWith({ ok: true });
    });

    it("returns error when not authenticated", async () => {
      getUserId.mockReturnValue(null);
      const cb = vi.fn();

      await socket._getHandler("msg:delete")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not authenticated" });
    });

    it("returns error when not a channel member", async () => {
      verifyChannelMember.mockResolvedValue(false);
      const cb = vi.fn();

      await socket._getHandler("msg:delete")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not a member of this channel" });
    });

    it("returns error on service exception", async () => {
      mockDelete.mockRejectedValue(new Error("Forbidden"));
      const cb = vi.fn();

      await socket._getHandler("msg:delete")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Forbidden" });
    });
  });

  // ── msg:react ─────────────────────────────────────────────────────────

  describe("msg:react", () => {
    const validData = {
      channelId: "ch-1",
      messageId: "msg-1",
      emoji: "thumbsup",
    };

    it("successfully toggles a reaction", async () => {
      const msg = makeMessage();
      mockReact.mockResolvedValue(msg);
      const cb = vi.fn();

      await socket._getHandler("msg:react")!(validData, cb);

      expect(mockReact).toHaveBeenCalledWith("ch-1", "msg-1", "thumbsup", "user-1");
      expect(collab.to).toHaveBeenCalledWith("channel:ch-1");
      expect(collab._toEmit).toHaveBeenCalledWith("msg:reacted", msg);
      expect(cb).toHaveBeenCalledWith({ ok: true });
    });

    it("returns error when not authenticated", async () => {
      getUserId.mockReturnValue(null);
      const cb = vi.fn();

      await socket._getHandler("msg:react")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not authenticated" });
    });

    it("returns error when not a channel member", async () => {
      verifyChannelMember.mockResolvedValue(false);
      const cb = vi.fn();

      await socket._getHandler("msg:react")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not a member of this channel" });
    });

    it("returns error on service exception", async () => {
      mockReact.mockRejectedValue(new Error("Message not found"));
      const cb = vi.fn();

      await socket._getHandler("msg:react")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Message not found" });
    });
  });

  // ── msg:pin ───────────────────────────────────────────────────────────

  describe("msg:pin", () => {
    const validData = {
      channelId: "ch-1",
      serverId: "srv-1",
      messageId: "msg-1",
    };

    it("successfully pins/unpins a message", async () => {
      const msg = makeMessage({ pinned: true });
      mockPin.mockResolvedValue(msg);
      const cb = vi.fn();

      await socket._getHandler("msg:pin")!(validData, cb);

      expect(mockPin).toHaveBeenCalledWith("ch-1", "srv-1", "msg-1");
      expect(collab.to).toHaveBeenCalledWith("channel:ch-1");
      expect(collab._toEmit).toHaveBeenCalledWith("msg:pinned", msg);
      expect(cb).toHaveBeenCalledWith({ ok: true });
    });

    it("returns error when not authenticated", async () => {
      getUserId.mockReturnValue(null);
      const cb = vi.fn();

      await socket._getHandler("msg:pin")!(validData, cb);

      expect(cb).toHaveBeenCalledWith({ ok: false, error: "Not authenticated" });
    });
  });

  // ── Handler registration ──────────────────────────────────────────────

  describe("handler registration", () => {
    it("registers all expected event handlers", () => {
      const events = socket.on.mock.calls.map((c: any[]) => c[0]);

      expect(events).toContain("msg:send");
      expect(events).toContain("msg:edit");
      expect(events).toContain("msg:delete");
      expect(events).toContain("msg:react");
      expect(events).toContain("msg:pin");
    });
  });
});
