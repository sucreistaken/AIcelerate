import { describe, it, expect, vi, beforeEach } from "vitest";

// Ensure env vars are set before any module loads
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Mock asyncHandler to just pass through the handler function
vi.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Mock channelService
const mockCreateForServer = vi.fn();
const mockGetByServer = vi.fn();
const mockGetById = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../../services/channelService", () => ({
  channelService: {
    createForServer: (...args: unknown[]) => mockCreateForServer(...args),
    getByServer: (...args: unknown[]) => mockGetByServer(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

import { channelController } from "../channelController";

// ---------- Helpers ----------

function makeAuthReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { userId: "user-1", role: "member" },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as Record<string, unknown>;
}

function makeRes() {
  const res: Record<string, unknown> = {
    statusCode: 200,
    _jsonData: null as unknown,
    _ended: false,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res._jsonData = data;
      return res;
    },
    end() {
      res._ended = true;
      return res;
    },
  };
  return res;
}

function makeChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch-1",
    roomId: "server-1",
    categoryId: "cat-1",
    name: "general",
    type: "text",
    ...overrides,
  };
}

// ---------- Tests ----------

describe("channelController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========== create ==========
  describe("create", () => {
    it("creates a channel in a server and returns 201", async () => {
      const channel = makeChannel();
      mockCreateForServer.mockResolvedValue(channel);

      const req = makeAuthReq({
        params: { serverId: "server-1" },
        body: {
          categoryId: "cat-1",
          name: "general",
          type: "text",
        },
      });
      const res = makeRes();

      await channelController.create(req, res);

      expect(mockCreateForServer).toHaveBeenCalledWith(
        "server-1",
        "user-1",
        "cat-1",
        "general",
        "text",
        undefined,
        undefined,
        undefined
      );
      expect(res.statusCode).toBe(201);
      expect(res._jsonData).toEqual({ ok: true, channel });
    });

    it("passes optional toolType, lessonId, lessonTitle to service", async () => {
      const channel = makeChannel({
        toolType: "quiz",
        lessonId: "lesson-1",
        lessonTitle: "Intro",
      });
      mockCreateForServer.mockResolvedValue(channel);

      const req = makeAuthReq({
        params: { serverId: "server-1" },
        body: {
          categoryId: "cat-1",
          name: "quiz-channel",
          type: "tool",
          toolType: "quiz",
          lessonId: "lesson-1",
          lessonTitle: "Intro",
        },
      });
      const res = makeRes();

      await channelController.create(req, res);

      expect(mockCreateForServer).toHaveBeenCalledWith(
        "server-1",
        "user-1",
        "cat-1",
        "quiz-channel",
        "tool",
        "quiz",
        "lesson-1",
        "Intro"
      );
      expect(res.statusCode).toBe(201);
    });

    it("propagates service error when room not found", async () => {
      mockCreateForServer.mockRejectedValue(
        Object.assign(new Error("Room not found"), {
          statusCode: 404,
          code: "NOT_FOUND",
        })
      );

      const req = makeAuthReq({
        params: { serverId: "nonexistent" },
        body: { categoryId: "cat-1", name: "ch", type: "text" },
      });
      const res = makeRes();

      await expect(channelController.create(req, res)).rejects.toThrow(
        "Room not found"
      );
    });

    it("propagates service error when user lacks permission", async () => {
      mockCreateForServer.mockRejectedValue(
        Object.assign(new Error("Missing permission: manage_channels"), {
          statusCode: 403,
          code: "FORBIDDEN",
        })
      );

      const req = makeAuthReq({
        user: { userId: "user-no-perms", role: "member" },
        params: { serverId: "server-1" },
        body: { categoryId: "cat-1", name: "ch", type: "text" },
      });
      const res = makeRes();

      await expect(channelController.create(req, res)).rejects.toThrow(
        "Missing permission: manage_channels"
      );
    });
  });

  // ========== getByServer ==========
  describe("getByServer", () => {
    it("returns all channels for a server", async () => {
      const channels = [
        makeChannel({ id: "ch-1", name: "general" }),
        makeChannel({ id: "ch-2", name: "announcements" }),
      ];
      mockGetByServer.mockResolvedValue(channels);

      const req = makeAuthReq({ params: { serverId: "server-1" } });
      const res = makeRes();

      await channelController.getByServer(req, res);

      expect(mockGetByServer).toHaveBeenCalledWith("server-1");
      expect(res.statusCode).toBe(200);
      expect(res._jsonData).toEqual({ ok: true, channels });
    });

    it("returns empty array when server has no channels", async () => {
      mockGetByServer.mockResolvedValue([]);

      const req = makeAuthReq({ params: { serverId: "server-1" } });
      const res = makeRes();

      await channelController.getByServer(req, res);

      expect(res._jsonData).toEqual({ ok: true, channels: [] });
    });
  });

  // ========== get ==========
  describe("get", () => {
    it("returns a channel by ID", async () => {
      const channel = makeChannel();
      mockGetById.mockResolvedValue(channel);

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "ch-1" },
      });
      const res = makeRes();

      await channelController.get(req, res);

      expect(mockGetById).toHaveBeenCalledWith("server-1", "ch-1");
      expect(res.statusCode).toBe(200);
      expect(res._jsonData).toEqual({ ok: true, channel });
    });

    it("propagates not found error when channel does not exist", async () => {
      mockGetById.mockRejectedValue(
        Object.assign(new Error("Channel not found"), {
          statusCode: 404,
          code: "NOT_FOUND",
        })
      );

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "nonexistent" },
      });
      const res = makeRes();

      await expect(channelController.get(req, res)).rejects.toThrow(
        "Channel not found"
      );
    });

    it("passes both serverId and channelId to the service", async () => {
      mockGetById.mockResolvedValue(makeChannel({ id: "ch-99" }));

      const req = makeAuthReq({
        params: { serverId: "srv-42", channelId: "ch-99" },
      });
      const res = makeRes();

      await channelController.get(req, res);

      expect(mockGetById).toHaveBeenCalledWith("srv-42", "ch-99");
    });
  });

  // ========== update ==========
  describe("update", () => {
    it("updates channel properties and returns updated channel", async () => {
      const updated = makeChannel({ name: "renamed" });
      mockUpdate.mockResolvedValue(updated);

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "ch-1" },
        body: { name: "renamed" },
      });
      const res = makeRes();

      await channelController.update(req, res);

      expect(mockUpdate).toHaveBeenCalledWith(
        "server-1",
        "ch-1",
        "user-1",
        { name: "renamed" }
      );
      expect(res.statusCode).toBe(200);
      expect(res._jsonData).toEqual({ ok: true, channel: updated });
    });

    it("passes full body to service for filtering", async () => {
      const updated = makeChannel({
        name: "updated",
        lessonId: "lesson-2",
        lessonTitle: "Advanced",
      });
      mockUpdate.mockResolvedValue(updated);

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "ch-1" },
        body: { name: "updated", lessonId: "lesson-2", lessonTitle: "Advanced" },
      });
      const res = makeRes();

      await channelController.update(req, res);

      expect(mockUpdate).toHaveBeenCalledWith(
        "server-1",
        "ch-1",
        "user-1",
        { name: "updated", lessonId: "lesson-2", lessonTitle: "Advanced" }
      );
    });

    it("propagates forbidden error when user lacks permission", async () => {
      mockUpdate.mockRejectedValue(
        Object.assign(new Error("Missing permission: manage_channels"), {
          statusCode: 403,
          code: "FORBIDDEN",
        })
      );

      const req = makeAuthReq({
        user: { userId: "user-no-perms", role: "member" },
        params: { serverId: "server-1", channelId: "ch-1" },
        body: { name: "hack" },
      });
      const res = makeRes();

      await expect(channelController.update(req, res)).rejects.toThrow(
        "Missing permission: manage_channels"
      );
    });

    it("propagates not found when room does not exist", async () => {
      mockUpdate.mockRejectedValue(
        Object.assign(new Error("Room not found"), {
          statusCode: 404,
          code: "NOT_FOUND",
        })
      );

      const req = makeAuthReq({
        params: { serverId: "nonexistent", channelId: "ch-1" },
        body: { name: "x" },
      });
      const res = makeRes();

      await expect(channelController.update(req, res)).rejects.toThrow(
        "Room not found"
      );
    });
  });

  // ========== delete ==========
  describe("delete", () => {
    it("deletes a channel and returns 204", async () => {
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "ch-1" },
      });
      const res = makeRes();

      await channelController.delete(req, res);

      expect(mockDelete).toHaveBeenCalledWith("server-1", "ch-1", "user-1");
      expect(res.statusCode).toBe(204);
      expect(res._ended).toBe(true);
    });

    it("does not return json body on delete", async () => {
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({
        params: { serverId: "server-1", channelId: "ch-1" },
      });
      const res = makeRes();

      await channelController.delete(req, res);

      expect(res._jsonData).toBeNull();
    });

    it("propagates forbidden when user is not owner and lacks role", async () => {
      mockDelete.mockRejectedValue(
        Object.assign(new Error("Missing permission: manage_channels"), {
          statusCode: 403,
          code: "FORBIDDEN",
        })
      );

      const req = makeAuthReq({
        user: { userId: "outsider", role: "member" },
        params: { serverId: "server-1", channelId: "ch-1" },
      });
      const res = makeRes();

      await expect(channelController.delete(req, res)).rejects.toThrow(
        "Missing permission: manage_channels"
      );
      expect(res._ended).toBe(false);
    });

    it("propagates not found when room does not exist", async () => {
      mockDelete.mockRejectedValue(
        Object.assign(new Error("Room not found"), {
          statusCode: 404,
          code: "NOT_FOUND",
        })
      );

      const req = makeAuthReq({
        params: { serverId: "nonexistent", channelId: "ch-1" },
      });
      const res = makeRes();

      await expect(channelController.delete(req, res)).rejects.toThrow(
        "Room not found"
      );
    });

    it("uses authenticated userId from req.user", async () => {
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({
        user: { userId: "admin-user-99", role: "admin" },
        params: { serverId: "server-1", channelId: "ch-1" },
      });
      const res = makeRes();

      await channelController.delete(req, res);

      expect(mockDelete).toHaveBeenCalledWith(
        "server-1",
        "ch-1",
        "admin-user-99"
      );
    });
  });
});
