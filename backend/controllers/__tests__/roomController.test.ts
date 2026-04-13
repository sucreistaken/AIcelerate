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

// Mock asyncHandler to just pass through the fn
vi.mock("../../utils/asyncHandler", () => ({
  asyncHandler: (fn: Function) => fn,
}));

// Mock roomService
const mockCreate = vi.fn();
const mockCreateSolo = vi.fn();
const mockDiscoverServers = vi.fn();
const mockGetById = vi.fn();
const mockGetByInviteCode = vi.fn();
const mockGetUserServers = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateTopic = vi.fn();
const mockJoin = vi.fn();
const mockJoinByInvite = vi.fn();
const mockLeave = vi.fn();
const mockKick = vi.fn();
const mockDelete = vi.fn();
const mockArchive = vi.fn();
const mockUnarchive = vi.fn();
const mockTransferOwnership = vi.fn();
const mockSetMaterial = vi.fn();
const mockAddCategory = vi.fn();
const mockRegenerateInvite = vi.fn();
const mockGetMemberProfiles = vi.fn();

const mockGetRoomTemplates = vi.fn();

vi.mock("../../services/roomService", () => ({
  roomService: {
    create: (...args: unknown[]) => mockCreate(...args),
    createSolo: (...args: unknown[]) => mockCreateSolo(...args),
    discoverServers: (...args: unknown[]) => mockDiscoverServers(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    getByInviteCode: (...args: unknown[]) => mockGetByInviteCode(...args),
    getUserServers: (...args: unknown[]) => mockGetUserServers(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    updateTopic: (...args: unknown[]) => mockUpdateTopic(...args),
    join: (...args: unknown[]) => mockJoin(...args),
    joinByInvite: (...args: unknown[]) => mockJoinByInvite(...args),
    leave: (...args: unknown[]) => mockLeave(...args),
    kick: (...args: unknown[]) => mockKick(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
    unarchive: (...args: unknown[]) => mockUnarchive(...args),
    transferOwnership: (...args: unknown[]) => mockTransferOwnership(...args),
    setMaterial: (...args: unknown[]) => mockSetMaterial(...args),
    addCategory: (...args: unknown[]) => mockAddCategory(...args),
    regenerateInvite: (...args: unknown[]) => mockRegenerateInvite(...args),
    getMemberProfiles: (...args: unknown[]) => mockGetMemberProfiles(...args),
  },
  getRoomTemplates: (...args: unknown[]) => mockGetRoomTemplates(...args),
}));

// Import after mocks
import { roomController } from "../roomController";

// ---------- Helpers ----------

interface MockReqOverrides {
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string | undefined>;
  user?: { userId: string; role: string };
}

function makeAuthReq(overrides: MockReqOverrides = {}) {
  return {
    user: { userId: "user-1", role: "user" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Parameters<typeof roomController.create>[0];
}

function makeRes() {
  const res = {
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
  return res as unknown as Parameters<typeof roomController.create>[1];
}

// Typed accessor helpers to read response data without `any`
function getResData(res: ReturnType<typeof makeRes>): Record<string, unknown> {
  return (res as unknown as { _jsonData: Record<string, unknown> })._jsonData;
}

function getResStatus(res: ReturnType<typeof makeRes>): number {
  return (res as unknown as { statusCode: number }).statusCode;
}

function getResEnded(res: ReturnType<typeof makeRes>): boolean {
  return (res as unknown as { _ended: boolean })._ended;
}

// ---------- Sample data ----------

const sampleRoom = {
  id: "room-1",
  name: "Test Room",
  description: "A test room",
  ownerId: "user-1",
  memberIds: ["user-1"],
  inviteCode: "ABC123",
  isPublic: false,
};

const samplePublicRoom = {
  id: "room-2",
  name: "Public Study Room",
  description: "A public room",
  ownerId: "user-2",
  memberIds: ["user-2"],
  isPublic: true,
  tags: ["math", "calculus"],
};

// ---------- Tests ----------

describe("roomController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a room with proper owner and returns 201", async () => {
      mockCreate.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({
        body: {
          name: "Test Room",
          description: "A test room",
          iconColor: "#6C5CE7",
          tags: ["study"],
          isPublic: false,
        },
      });
      const res = makeRes();

      await roomController.create(req, res);

      expect(mockCreate).toHaveBeenCalledWith(
        "Test Room",
        "A test room",
        "user-1",
        "#6C5CE7",
        {
          tags: ["study"],
          university: undefined,
          isPublic: false,
          templateId: undefined,
        }
      );
      expect(getResStatus(res)).toBe(201);
      expect(getResData(res)).toEqual({ ok: true, room: sampleRoom });
    });

    it("passes templateId from body to service", async () => {
      mockCreate.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({
        body: {
          name: "Template Room",
          description: "",
          templateId: "study-group",
        },
      });
      const res = makeRes();

      await roomController.create(req, res);

      expect(mockCreate).toHaveBeenCalledWith(
        "Template Room",
        "",
        "user-1",
        undefined,
        expect.objectContaining({ templateId: "study-group" })
      );
    });

    it("propagates service errors", async () => {
      mockCreate.mockRejectedValue(new Error("Room name must be at least 2 characters"));

      const req = makeAuthReq({ body: { name: "X", description: "" } });
      const res = makeRes();

      await expect(roomController.create(req, res)).rejects.toThrow(
        "Room name must be at least 2 characters"
      );
    });
  });

  // ── createSolo ────────────────────────────────────────────────────────

  describe("createSolo", () => {
    it("creates a solo room with topic and tags", async () => {
      mockCreateSolo.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({
        body: { name: "Solo Room", topic: "Linear Algebra", templateId: "study-group", tags: ["math"] },
      });
      const res = makeRes();

      await roomController.createSolo(req, res);

      expect(mockCreateSolo).toHaveBeenCalledWith("Solo Room", "user-1", {
        topic: "Linear Algebra",
        templateId: "study-group",
        tags: ["math"],
      });
      expect(getResStatus(res)).toBe(201);
      expect(getResData(res)).toEqual({ ok: true, room: sampleRoom });
    });
  });

  // ── get ────────────────────────────────────────────────────────────────

  describe("get", () => {
    it("returns room by ID", async () => {
      mockGetById.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.get(req, res);

      expect(mockGetById).toHaveBeenCalledWith("room-1");
      expect(getResStatus(res)).toBe(200);
      expect(getResData(res)).toEqual({ ok: true, room: sampleRoom });
    });

    it("propagates not-found error from service", async () => {
      mockGetById.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({ params: { id: "nonexistent" } });
      const res = makeRes();

      await expect(roomController.get(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── getByInviteCode ───────────────────────────────────────────────────

  describe("getByInviteCode", () => {
    it("returns room by invite code", async () => {
      mockGetByInviteCode.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({ params: { code: "ABC123" } });
      const res = makeRes();

      await roomController.getByInviteCode(req, res);

      expect(mockGetByInviteCode).toHaveBeenCalledWith("ABC123");
      expect(getResData(res)).toEqual({ ok: true, room: sampleRoom });
    });

    it("propagates invalid invite code error", async () => {
      mockGetByInviteCode.mockRejectedValue(new Error("Invalid invite code"));

      const req = makeAuthReq({ params: { code: "BADCODE" } });
      const res = makeRes();

      await expect(roomController.getByInviteCode(req, res)).rejects.toThrow(
        "Invalid invite code"
      );
    });
  });

  // ── getUserRooms ──────────────────────────────────────────────────────

  describe("getUserRooms", () => {
    it("returns rooms for the authenticated user", async () => {
      mockGetUserServers.mockResolvedValue([sampleRoom]);

      const req = makeAuthReq();
      const res = makeRes();

      await roomController.getUserRooms(req, res);

      expect(mockGetUserServers).toHaveBeenCalledWith("user-1");
      expect(getResData(res)).toEqual({ ok: true, rooms: [sampleRoom] });
    });

    it("returns empty array when user has no rooms", async () => {
      mockGetUserServers.mockResolvedValue([]);

      const req = makeAuthReq();
      const res = makeRes();

      await roomController.getUserRooms(req, res);

      expect(getResData(res)).toEqual({ ok: true, rooms: [] });
    });
  });

  // ── getUserServers (legacy alias) ─────────────────────────────────────

  describe("getUserServers", () => {
    it("returns the same result as getUserRooms", async () => {
      mockGetUserServers.mockResolvedValue([sampleRoom, samplePublicRoom]);

      const req = makeAuthReq();
      const res = makeRes();

      await roomController.getUserServers(req, res);

      expect(mockGetUserServers).toHaveBeenCalledWith("user-1");
      expect(getResData(res)).toEqual({
        ok: true,
        rooms: [sampleRoom, samplePublicRoom],
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates room when called by owner", async () => {
      const updatedRoom = { ...sampleRoom, name: "Updated Room" };
      mockUpdate.mockResolvedValue(updatedRoom);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { name: "Updated Room" },
      });
      const res = makeRes();

      await roomController.update(req, res);

      expect(mockUpdate).toHaveBeenCalledWith("room-1", "user-1", { name: "Updated Room" });
      expect(getResData(res)).toEqual({ ok: true, room: updatedRoom });
    });

    it("propagates forbidden error when non-owner updates", async () => {
      mockUpdate.mockRejectedValue(new Error("Missing permission: manage_server"));

      const req = makeAuthReq({
        user: { userId: "user-other", role: "user" },
        params: { id: "room-1" },
        body: { name: "Hacked" },
      });
      const res = makeRes();

      await expect(roomController.update(req, res)).rejects.toThrow(
        "Missing permission: manage_server"
      );
    });

    it("propagates not-found error for nonexistent room", async () => {
      mockUpdate.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({
        params: { id: "nonexistent" },
        body: { name: "No Room" },
      });
      const res = makeRes();

      await expect(roomController.update(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── updateTopic ───────────────────────────────────────────────────────

  describe("updateTopic", () => {
    it("updates room topic", async () => {
      const updatedRoom = { ...sampleRoom, description: "New Topic" };
      mockUpdateTopic.mockResolvedValue(updatedRoom);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { topic: "New Topic" },
      });
      const res = makeRes();

      await roomController.updateTopic(req, res);

      expect(mockUpdateTopic).toHaveBeenCalledWith("room-1", "user-1", "New Topic");
      expect(getResData(res)).toEqual({ ok: true, room: updatedRoom });
    });
  });

  // ── delete ────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("deletes room and returns 204 when called by owner", async () => {
      mockDelete.mockResolvedValue(undefined);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.delete(req, res);

      expect(mockDelete).toHaveBeenCalledWith("room-1", "user-1");
      expect(getResStatus(res)).toBe(204);
      expect(getResEnded(res)).toBe(true);
    });

    it("propagates forbidden error when non-owner deletes", async () => {
      mockDelete.mockRejectedValue(new Error("Only the owner can delete the room"));

      const req = makeAuthReq({
        user: { userId: "user-intruder", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await expect(roomController.delete(req, res)).rejects.toThrow(
        "Only the owner can delete the room"
      );
    });

    it("propagates not-found error for nonexistent room", async () => {
      mockDelete.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({ params: { id: "nonexistent" } });
      const res = makeRes();

      await expect(roomController.delete(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── join ──────────────────────────────────────────────────────────────

  describe("join", () => {
    it("joins a room and returns the updated room", async () => {
      const roomWithMember = {
        ...sampleRoom,
        memberIds: ["user-1", "user-joiner"],
      };
      mockJoin.mockResolvedValue(roomWithMember);

      const req = makeAuthReq({
        user: { userId: "user-joiner", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await roomController.join(req, res);

      expect(mockJoin).toHaveBeenCalledWith("room-1", "user-joiner");
      expect(getResData(res)).toEqual({ ok: true, room: roomWithMember });
    });

    it("propagates error when room is full", async () => {
      mockJoin.mockRejectedValue(new Error("Room is full"));

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await expect(roomController.join(req, res)).rejects.toThrow("Room is full");
    });

    it("propagates not-found error for nonexistent room", async () => {
      mockJoin.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({ params: { id: "ghost-room" } });
      const res = makeRes();

      await expect(roomController.join(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── joinByInvite ──────────────────────────────────────────────────────

  describe("joinByInvite", () => {
    it("joins a room via invite code", async () => {
      const roomWithMember = {
        ...sampleRoom,
        memberIds: ["user-1", "user-invited"],
      };
      mockJoinByInvite.mockResolvedValue(roomWithMember);

      const req = makeAuthReq({
        user: { userId: "user-invited", role: "user" },
        body: { inviteCode: "ABC123" },
      });
      const res = makeRes();

      await roomController.joinByInvite(req, res);

      expect(mockJoinByInvite).toHaveBeenCalledWith("ABC123", "user-invited");
      expect(getResData(res)).toEqual({ ok: true, room: roomWithMember });
    });

    it("propagates invalid invite code error", async () => {
      mockJoinByInvite.mockRejectedValue(new Error("Invalid invite code"));

      const req = makeAuthReq({ body: { inviteCode: "INVALID" } });
      const res = makeRes();

      await expect(roomController.joinByInvite(req, res)).rejects.toThrow(
        "Invalid invite code"
      );
    });
  });

  // ── leave ─────────────────────────────────────────────────────────────

  describe("leave", () => {
    it("leaves a room successfully", async () => {
      mockLeave.mockResolvedValue(undefined);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.leave(req, res);

      expect(mockLeave).toHaveBeenCalledWith("room-1", "user-1");
      expect(getResData(res)).toEqual({ ok: true });
    });

    it("propagates error when not a member", async () => {
      mockLeave.mockRejectedValue(new Error("Not a member"));

      const req = makeAuthReq({
        user: { userId: "user-outsider", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await expect(roomController.leave(req, res)).rejects.toThrow("Not a member");
    });

    it("propagates not-found error for nonexistent room", async () => {
      mockLeave.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({ params: { id: "nonexistent" } });
      const res = makeRes();

      await expect(roomController.leave(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── kick ──────────────────────────────────────────────────────────────

  describe("kick", () => {
    it("kicks a member when requester has permission", async () => {
      mockKick.mockResolvedValue(undefined);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { targetId: "user-bad" },
      });
      const res = makeRes();

      await roomController.kick(req, res);

      expect(mockKick).toHaveBeenCalledWith("room-1", "user-1", "user-bad");
      expect(getResData(res)).toEqual({ ok: true });
    });

    it("propagates forbidden error when lacking permission", async () => {
      mockKick.mockRejectedValue(new Error("Missing permission: kick_members"));

      const req = makeAuthReq({
        user: { userId: "user-no-perms", role: "user" },
        params: { id: "room-1" },
        body: { targetId: "user-target" },
      });
      const res = makeRes();

      await expect(roomController.kick(req, res)).rejects.toThrow(
        "Missing permission: kick_members"
      );
    });

    it("propagates error when trying to kick the owner", async () => {
      mockKick.mockRejectedValue(new Error("Cannot kick the owner"));

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { targetId: "user-1" },
      });
      const res = makeRes();

      await expect(roomController.kick(req, res)).rejects.toThrow("Cannot kick the owner");
    });

    it("propagates error when trying to kick yourself", async () => {
      mockKick.mockRejectedValue(new Error("Cannot kick yourself"));

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { targetId: "user-1" },
      });
      const res = makeRes();

      await expect(roomController.kick(req, res)).rejects.toThrow("Cannot kick yourself");
    });
  });

  // ── discover ──────────────────────────────────────────────────────────

  describe("discover", () => {
    it("returns public rooms without filters", async () => {
      mockDiscoverServers.mockResolvedValue([samplePublicRoom]);

      const req = makeAuthReq({ query: {} });
      const res = makeRes();

      await roomController.discover(req, res);

      expect(mockDiscoverServers).toHaveBeenCalledWith(undefined, undefined);
      expect(getResData(res)).toEqual({ ok: true, rooms: [samplePublicRoom] });
    });

    it("passes search query to service", async () => {
      mockDiscoverServers.mockResolvedValue([samplePublicRoom]);

      const req = makeAuthReq({ query: { search: "calculus" } });
      const res = makeRes();

      await roomController.discover(req, res);

      expect(mockDiscoverServers).toHaveBeenCalledWith("calculus", undefined);
    });

    it("parses comma-separated tags", async () => {
      mockDiscoverServers.mockResolvedValue([samplePublicRoom]);

      const req = makeAuthReq({ query: { tag: "math, calculus, algebra" } });
      const res = makeRes();

      await roomController.discover(req, res);

      expect(mockDiscoverServers).toHaveBeenCalledWith(undefined, [
        "math",
        "calculus",
        "algebra",
      ]);
    });

    it("combines search and tag filters", async () => {
      mockDiscoverServers.mockResolvedValue([]);

      const req = makeAuthReq({ query: { search: "linear", tag: "math" } });
      const res = makeRes();

      await roomController.discover(req, res);

      expect(mockDiscoverServers).toHaveBeenCalledWith("linear", ["math"]);
      expect(getResData(res)).toEqual({ ok: true, rooms: [] });
    });

    it("filters out empty tag strings", async () => {
      mockDiscoverServers.mockResolvedValue([]);

      const req = makeAuthReq({ query: { tag: "math,,, ,algebra" } });
      const res = makeRes();

      await roomController.discover(req, res);

      expect(mockDiscoverServers).toHaveBeenCalledWith(undefined, ["math", "algebra"]);
    });
  });

  // ── getTemplates ──────────────────────────────────────────────────────

  describe("getTemplates", () => {
    it("returns room templates synchronously", () => {
      const templates = [
        { id: "study-group", label: "Study Group", description: "A study group" },
      ];
      mockGetRoomTemplates.mockReturnValue(templates);

      const req = makeAuthReq();
      const res = makeRes();

      roomController.getTemplates(req, res);

      expect(mockGetRoomTemplates).toHaveBeenCalled();
      expect(getResData(res)).toEqual({ ok: true, templates });
    });
  });

  // ── archive ───────────────────────────────────────────────────────────

  describe("archive", () => {
    it("archives room when called by owner", async () => {
      const archivedRoom = { ...sampleRoom, archivedAt: "2026-04-13T00:00:00.000Z" };
      mockArchive.mockResolvedValue(archivedRoom);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.archive(req, res);

      expect(mockArchive).toHaveBeenCalledWith("room-1", "user-1");
      expect(getResData(res)).toEqual({ ok: true, room: archivedRoom });
    });

    it("propagates forbidden error when non-owner archives", async () => {
      mockArchive.mockRejectedValue(new Error("Only the owner can archive the room"));

      const req = makeAuthReq({
        user: { userId: "user-other", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await expect(roomController.archive(req, res)).rejects.toThrow(
        "Only the owner can archive the room"
      );
    });
  });

  // ── unarchive ─────────────────────────────────────────────────────────

  describe("unarchive", () => {
    it("unarchives room when called by owner", async () => {
      mockUnarchive.mockResolvedValue(sampleRoom);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.unarchive(req, res);

      expect(mockUnarchive).toHaveBeenCalledWith("room-1", "user-1");
      expect(getResData(res)).toEqual({ ok: true, room: sampleRoom });
    });

    it("propagates forbidden error when non-owner unarchives", async () => {
      mockUnarchive.mockRejectedValue(new Error("Only the owner can unarchive the room"));

      const req = makeAuthReq({
        user: { userId: "user-other", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await expect(roomController.unarchive(req, res)).rejects.toThrow(
        "Only the owner can unarchive the room"
      );
    });
  });

  // ── transferOwnership ─────────────────────────────────────────────────

  describe("transferOwnership", () => {
    it("transfers ownership to a new member", async () => {
      const transferred = { ...sampleRoom, ownerId: "user-new-owner" };
      mockTransferOwnership.mockResolvedValue(transferred);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { newOwnerId: "user-new-owner" },
      });
      const res = makeRes();

      await roomController.transferOwnership(req, res);

      expect(mockTransferOwnership).toHaveBeenCalledWith("room-1", "user-1", "user-new-owner");
      expect(getResData(res)).toEqual({ ok: true, room: transferred });
    });

    it("propagates forbidden error when non-owner transfers", async () => {
      mockTransferOwnership.mockRejectedValue(
        new Error("Only the owner can transfer ownership")
      );

      const req = makeAuthReq({
        user: { userId: "user-other", role: "user" },
        params: { id: "room-1" },
        body: { newOwnerId: "user-other" },
      });
      const res = makeRes();

      await expect(roomController.transferOwnership(req, res)).rejects.toThrow(
        "Only the owner can transfer ownership"
      );
    });

    it("propagates error when new owner is not a member", async () => {
      mockTransferOwnership.mockRejectedValue(
        new Error("New owner must be a member")
      );

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { newOwnerId: "user-stranger" },
      });
      const res = makeRes();

      await expect(roomController.transferOwnership(req, res)).rejects.toThrow(
        "New owner must be a member"
      );
    });
  });

  // ── setMaterial ───────────────────────────────────────────────────────

  describe("setMaterial", () => {
    it("sets material on room", async () => {
      const updated = { ...sampleRoom, materialId: "mat-1" };
      mockSetMaterial.mockResolvedValue(updated);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { materialId: "mat-1" },
      });
      const res = makeRes();

      await roomController.setMaterial(req, res);

      expect(mockSetMaterial).toHaveBeenCalledWith("room-1", "user-1", "mat-1");
      expect(getResData(res)).toEqual({ ok: true, room: updated });
    });
  });

  // ── addCategory ───────────────────────────────────────────────────────

  describe("addCategory", () => {
    it("adds a category to the room", async () => {
      const updated = {
        ...sampleRoom,
        categories: [{ id: "cat-1", name: "New Cat", position: 0, channelIds: [] }],
      };
      mockAddCategory.mockResolvedValue(updated);

      const req = makeAuthReq({
        params: { id: "room-1" },
        body: { name: "New Cat" },
      });
      const res = makeRes();

      await roomController.addCategory(req, res);

      expect(mockAddCategory).toHaveBeenCalledWith("room-1", "user-1", "New Cat");
      expect(getResData(res)).toEqual({ ok: true, room: updated });
    });
  });

  // ── regenerateInvite ──────────────────────────────────────────────────

  describe("regenerateInvite", () => {
    it("regenerates invite code and returns it", async () => {
      mockRegenerateInvite.mockResolvedValue("XYZ789");

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.regenerateInvite(req, res);

      expect(mockRegenerateInvite).toHaveBeenCalledWith("room-1", "user-1");
      expect(getResData(res)).toEqual({ ok: true, inviteCode: "XYZ789" });
    });

    it("propagates permission error", async () => {
      mockRegenerateInvite.mockRejectedValue(
        new Error("Missing permission: manage_server")
      );

      const req = makeAuthReq({
        user: { userId: "user-no-perms", role: "user" },
        params: { id: "room-1" },
      });
      const res = makeRes();

      await expect(roomController.regenerateInvite(req, res)).rejects.toThrow(
        "Missing permission: manage_server"
      );
    });
  });

  // ── getMembers ────────────────────────────────────────────────────────

  describe("getMembers", () => {
    it("returns member profiles for a room", async () => {
      const members = [
        { id: "user-1", nickname: "Alice", avatar: "avatar-1", status: "online", roles: ["role-owner"] },
        { id: "user-2", nickname: "Bob", avatar: "avatar-2", status: "offline", roles: ["role-member"] },
      ];
      mockGetMemberProfiles.mockResolvedValue(members);

      const req = makeAuthReq({ params: { id: "room-1" } });
      const res = makeRes();

      await roomController.getMembers(req, res);

      expect(mockGetMemberProfiles).toHaveBeenCalledWith("room-1");
      expect(getResData(res)).toEqual({ ok: true, members });
    });

    it("propagates not-found error for nonexistent room", async () => {
      mockGetMemberProfiles.mockRejectedValue(new Error("Room not found"));

      const req = makeAuthReq({ params: { id: "nonexistent" } });
      const res = makeRes();

      await expect(roomController.getMembers(req, res)).rejects.toThrow("Room not found");
    });
  });

  // ── userId extraction ─────────────────────────────────────────────────

  describe("userId extraction", () => {
    it("uses req.user.userId for all authenticated endpoints", async () => {
      mockGetUserServers.mockResolvedValue([]);
      mockCreate.mockResolvedValue(sampleRoom);
      mockLeave.mockResolvedValue(undefined);

      // Test with a different userId to verify it reads from req.user
      const customUser = { userId: "custom-user-id", role: "admin" };

      const reqRooms = makeAuthReq({ user: customUser });
      const resRooms = makeRes();
      await roomController.getUserRooms(reqRooms, resRooms);
      expect(mockGetUserServers).toHaveBeenCalledWith("custom-user-id");

      const reqCreate = makeAuthReq({
        user: customUser,
        body: { name: "Room", description: "" },
      });
      const resCreate = makeRes();
      await roomController.create(reqCreate, resCreate);
      expect(mockCreate).toHaveBeenCalledWith(
        "Room",
        "",
        "custom-user-id",
        undefined,
        expect.objectContaining({})
      );

      const reqLeave = makeAuthReq({
        user: customUser,
        params: { id: "room-1" },
      });
      const resLeave = makeRes();
      await roomController.leave(reqLeave, resLeave);
      expect(mockLeave).toHaveBeenCalledWith("room-1", "custom-user-id");
    });
  });
});
