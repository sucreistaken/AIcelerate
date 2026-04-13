import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock middleware error helpers
vi.mock("../../middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    constructor(public statusCode: number, message: string, public code?: string) {
      super(message);
      this.name = "AppError";
    }
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

// Mock messageService
const mockSend = vi.fn();
const mockGetMessages = vi.fn();
const mockGetThread = vi.fn();
const mockEdit = vi.fn();
const mockDelete = vi.fn();
const mockReact = vi.fn();
const mockPin = vi.fn();
const mockSendLobby = vi.fn();

vi.mock("../../services/messageService", () => ({
  messageService: {
    send: (...args: any[]) => mockSend(...args),
    getMessages: (...args: any[]) => mockGetMessages(...args),
    getThread: (...args: any[]) => mockGetThread(...args),
    edit: (...args: any[]) => mockEdit(...args),
    delete: (...args: any[]) => mockDelete(...args),
    react: (...args: any[]) => mockReact(...args),
    pin: (...args: any[]) => mockPin(...args),
    sendLobby: (...args: any[]) => mockSendLobby(...args),
  },
}));

// Mock asyncHandler to just pass through
vi.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Mock Room model
const mockRoomFindById = vi.fn();
vi.mock("../../models/Room", () => ({
  Room: {
    findById: (...args: any[]) => mockRoomFindById(...args),
  },
}));

// Mock Channel model
const mockChannelFindById = vi.fn();
vi.mock("../../models/Channel", () => ({
  Channel: {
    findById: (...args: any[]) => mockChannelFindById(...args),
  },
}));

import { messageController } from "../messageController";

// ---------- Helpers ----------

function makeAuthReq(overrides: Record<string, any> = {}) {
  return {
    user: { userId: "user-1", role: "member" },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    _jsonData: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res._jsonData = data;
      return res;
    },
  };
  return res;
}

function makeChannel(overrides: Record<string, any> = {}) {
  return {
    _id: "ch-1",
    roomId: "room-1",
    name: "general",
    type: "text",
    ...overrides,
  };
}

function makeRoom(overrides: Record<string, any> = {}) {
  return {
    _id: "room-1",
    memberIds: ["user-1", "user-2"],
    ownerId: "user-1",
    ...overrides,
  };
}

describe("messageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── verifyMembership (tested through controller methods) ────────────

  describe("verifyMembership", () => {
    it("passes for room members", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1", "user-2"] }));
      mockGetMessages.mockResolvedValue([]);

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        query: {},
      });
      const res = makeRes();

      // Should not throw
      await messageController.getMessages(req, res);

      expect(res._jsonData).toBeDefined();
    });

    it("throws forbidden for non-members", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-2", "user-3"] })); // user-1 is NOT a member

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        query: {},
      });
      const res = makeRes();

      await expect(messageController.getMessages(req, res)).rejects.toThrow(
        "Not a member of this server"
      );
    });

    it("skips check for global-lobby", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel({ roomId: "global-lobby" }));
      mockGetMessages.mockResolvedValue([]);

      const req = makeAuthReq({
        params: { channelId: "ch-lobby" },
        query: {},
      });
      const res = makeRes();

      // Should not throw and should NOT call Room.findById
      await messageController.getMessages(req, res);

      expect(mockRoomFindById).not.toHaveBeenCalled();
      expect(res._jsonData).toBeDefined();
    });

    it("throws notFound when channel doesn't exist", async () => {
      mockChannelFindById.mockResolvedValue(null);

      const req = makeAuthReq({
        params: { channelId: "nonexistent" },
        query: {},
      });
      const res = makeRes();

      await expect(messageController.getMessages(req, res)).rejects.toThrow(
        "Channel not found"
      );
    });

    it("throws notFound when room doesn't exist", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel({ roomId: "room-999" }));
      mockRoomFindById.mockResolvedValue(null);

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        query: {},
      });
      const res = makeRes();

      await expect(messageController.getMessages(req, res)).rejects.toThrow(
        "Room not found"
      );
    });
  });

  // ── send() ──────────────────────────────────────────────────────────

  describe("send()", () => {
    it("calls verifyMembership then messageService.send", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      const sentMsg = { id: "msg-1", content: "Hello" };
      mockSend.mockResolvedValue(sentMsg);

      const req = makeAuthReq({
        params: { channelId: "ch-1", serverId: "room-1" },
        body: { content: "Hello", type: "text", embeds: [], threadId: undefined },
      });
      const res = makeRes();

      await messageController.send(req, res);

      expect(mockChannelFindById).toHaveBeenCalledWith("ch-1");
      expect(mockSend).toHaveBeenCalledWith("ch-1", "room-1", "user-1", "Hello", "text", [], undefined);
      expect(res.statusCode).toBe(201);
      expect(res._jsonData).toEqual({ ok: true, message: sentMsg });
    });

    it("uses serverId from body if not in params", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      mockSend.mockResolvedValue({ id: "msg-1" });

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        body: { content: "Hello", serverId: "room-from-body" },
      });
      const res = makeRes();

      await messageController.send(req, res);

      expect(mockSend).toHaveBeenCalledWith(
        "ch-1",
        "room-from-body",
        "user-1",
        "Hello",
        undefined,
        undefined,
        undefined
      );
    });
  });

  // ── edit() ──────────────────────────────────────────────────────────

  describe("edit()", () => {
    it("calls verifyMembership then messageService.edit", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      const editedMsg = { id: "msg-1", content: "Edited", edited: true };
      mockEdit.mockResolvedValue(editedMsg);

      const req = makeAuthReq({
        params: { channelId: "ch-1", messageId: "msg-1" },
        body: { content: "Edited" },
      });
      const res = makeRes();

      await messageController.edit(req, res);

      expect(mockEdit).toHaveBeenCalledWith("ch-1", "msg-1", "user-1", "Edited");
      expect(res._jsonData).toEqual({ ok: true, message: editedMsg });
    });
  });

  // ── delete() ────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("calls verifyMembership then messageService.delete", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({
        params: { channelId: "ch-1", messageId: "msg-1" },
        user: { userId: "user-1", role: "member" },
      });
      const res = makeRes();

      await messageController.delete(req, res);

      expect(mockDelete).toHaveBeenCalledWith("ch-1", "msg-1", "user-1", false);
      expect(res._jsonData).toEqual({ ok: true });
    });

    it("passes isAdmin true when user role is admin", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({
        params: { channelId: "ch-1", messageId: "msg-1" },
        user: { userId: "user-1", role: "admin" },
      });
      const res = makeRes();

      await messageController.delete(req, res);

      expect(mockDelete).toHaveBeenCalledWith("ch-1", "msg-1", "user-1", true);
    });
  });

  // ── getMessages() ───────────────────────────────────────────────────

  describe("getMessages()", () => {
    it("calls verifyMembership then returns messages", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      const messages = [{ id: "m1", content: "Hello" }, { id: "m2", content: "World" }];
      mockGetMessages.mockResolvedValue(messages);

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        query: { limit: "25", before: "cursor-1" },
      });
      const res = makeRes();

      await messageController.getMessages(req, res);

      expect(mockGetMessages).toHaveBeenCalledWith("ch-1", 25, "cursor-1");
      expect(res._jsonData).toEqual({ ok: true, messages });
    });

    it("uses default limit of 50 when not provided", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      mockGetMessages.mockResolvedValue([]);

      const req = makeAuthReq({
        params: { channelId: "ch-1" },
        query: {},
      });
      const res = makeRes();

      await messageController.getMessages(req, res);

      expect(mockGetMessages).toHaveBeenCalledWith("ch-1", 50, undefined);
    });
  });

  // ── react() ─────────────────────────────────────────────────────────

  describe("react()", () => {
    it("calls verifyMembership then messageService.react", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      const updatedMsg = { id: "msg-1", reactions: [{ emoji: "thumbsup", userIds: ["user-1"] }] };
      mockReact.mockResolvedValue(updatedMsg);

      const req = makeAuthReq({
        params: { channelId: "ch-1", messageId: "msg-1" },
        body: { emoji: "thumbsup" },
      });
      const res = makeRes();

      await messageController.react(req, res);

      expect(mockReact).toHaveBeenCalledWith("ch-1", "msg-1", "thumbsup", "user-1");
      expect(res._jsonData).toEqual({ ok: true, message: updatedMsg });
    });
  });

  // ── pin() ───────────────────────────────────────────────────────────

  describe("pin()", () => {
    it("calls verifyMembership then messageService.pin", async () => {
      mockChannelFindById.mockResolvedValue(makeChannel());
      mockRoomFindById.mockResolvedValue(makeRoom({ memberIds: ["user-1"] }));
      const pinnedMsg = { id: "msg-1", pinned: true };
      mockPin.mockResolvedValue(pinnedMsg);

      const req = makeAuthReq({
        params: { channelId: "ch-1", messageId: "msg-1" },
        body: { serverId: "room-1" },
      });
      const res = makeRes();

      await messageController.pin(req, res);

      expect(mockPin).toHaveBeenCalledWith("ch-1", "room-1", "msg-1");
      expect(res._jsonData).toEqual({ ok: true, message: pinnedMsg });
    });
  });
});
