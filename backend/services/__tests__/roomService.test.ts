import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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

// Mock room cache
vi.mock("../../utils/cache", () => ({
  roomCache: {
    getOrSet: vi.fn(async (_key: string, fn: () => any) => fn()),
    del: vi.fn(),
  },
}));

// Mock serverTemplates
vi.mock("../serverTemplates", () => ({
  getServerTemplates: vi.fn(() => []),
}));

// Mock middleware error helpers
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

// ---------- Model mocks ----------

// Room mock
const mockRoomCreate = vi.fn();
const mockRoomFindById = vi.fn();
const mockRoomFindByIdAndUpdate = vi.fn();
const mockRoomFindByIdAndDelete = vi.fn();
const mockRoomFindOne = vi.fn();
const mockRoomFind = vi.fn();
const mockRoomExists = vi.fn();
const mockRoomUpdateMany = vi.fn();

vi.mock("../../models/Room", () => ({
  Room: {
    create: (...args: any[]) => mockRoomCreate(...args),
    findById: (...args: any[]) => mockRoomFindById(...args),
    findByIdAndUpdate: (...args: any[]) => mockRoomFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: any[]) => mockRoomFindByIdAndDelete(...args),
    findOne: (...args: any[]) => mockRoomFindOne(...args),
    find: (...args: any[]) => mockRoomFind(...args),
    exists: (...args: any[]) => mockRoomExists(...args),
    updateMany: (...args: any[]) => mockRoomUpdateMany(...args),
  },
  DEFAULT_ROLES: [
    { id: "role-owner", name: "Owner", color: "#E74C3C", permissions: ["manage_server", "kick_members"], position: 3 },
    { id: "role-admin", name: "Admin", color: "#3498DB", permissions: ["kick_members"], position: 2 },
    { id: "role-member", name: "Member", color: "#95A5A6", permissions: ["send_messages"], position: 0 },
  ],
}));

// User mock
const mockUserFindById = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockUserExists = vi.fn();

vi.mock("../../models/User", () => ({
  User: {
    findById: (...args: any[]) => mockUserFindById(...args),
    findByIdAndUpdate: (...args: any[]) => mockUserFindByIdAndUpdate(...args),
    updateMany: (...args: any[]) => mockUserUpdateMany(...args),
    exists: (...args: any[]) => mockUserExists(...args),
    find: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

// Channel mock
const mockChannelCreate = vi.fn();
const mockChannelInsertMany = vi.fn();
const mockChannelFind = vi.fn();
const mockChannelDeleteMany = vi.fn();

vi.mock("../../models/Channel", () => ({
  Channel: {
    create: (...args: any[]) => mockChannelCreate(...args),
    insertMany: (...args: any[]) => mockChannelInsertMany(...args),
    find: (...args: any[]) => mockChannelFind(...args),
    deleteMany: (...args: any[]) => mockChannelDeleteMany(...args),
  },
}));

// Message mock (for delete cascade)
const mockMessageDeleteMany = vi.fn();
vi.mock("../../models/Message", () => ({
  Message: {
    deleteMany: (...args: any[]) => mockMessageDeleteMany(...args),
  },
}));

// Dynamic import mocks (used by roomService.delete)
vi.mock("../../models/ToolData", () => ({
  ToolData: {
    deleteMany: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../models/Material", () => ({
  Material: {
    deleteMany: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../models/Notification", () => ({
  Notification: {
    deleteMany: vi.fn().mockResolvedValue(null),
  },
}));

// Mock mongoose session — self-contained inside factory, accessed via _testSession on default export
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  const _session = {
    startTransaction: vi.fn(),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    abortTransaction: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn(),
  };
  return {
    ...actual as any,
    default: {
      ...(actual as any).default,
      startSession: vi.fn().mockResolvedValue(_session),
      _testSession: _session,
    },
  };
});

import mongoose from "mongoose";
import { roomService } from "../roomService";

// Access the test session from the mocked mongoose
const mockSession = (mongoose as any)._testSession;

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

function makeRoom(overrides: Record<string, any> = {}) {
  return {
    _id: { toString: () => overrides._idStr || "room-1" },
    name: "Test Room",
    description: "A test room",
    iconColor: "#6C5CE7",
    inviteCode: "ABC123",
    ownerId: "owner-1",
    isPublic: false,
    memberIds: ["owner-1"],
    memberRoles: new Map([["owner-1", ["role-owner"]]]),
    categories: [
      { id: "cat-1", name: "Genel", position: 0, channelIds: [] },
      { id: "cat-2", name: "Calisma", position: 1, channelIds: [] },
    ],
    roles: [
      { id: "role-owner", name: "Owner", color: "#E74C3C", permissions: ["manage_server", "kick_members"], position: 3 },
      { id: "role-admin", name: "Admin", color: "#3498DB", permissions: ["kick_members"], position: 2 },
      { id: "role-member", name: "Member", color: "#95A5A6", permissions: ["send_messages"], position: 0 },
    ],
    settings: { maxMembers: 50, isPublic: false, defaultRole: "role-member" },
    tags: [],
    memberCount: 1,
    lastActivityAt: new Date(),
    pinned: false,
    markModified: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    toJSON() {
      return {
        id: this._id.toString(),
        name: this.name,
        description: this.description,
        ownerId: this.ownerId,
        memberIds: this.memberIds,
        memberCount: this.memberCount,
        inviteCode: this.inviteCode,
        categories: this.categories,
        roles: this.roles,
        settings: this.settings,
      };
    },
    ...overrides,
  };
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    _id: "user-1",
    profile: { nickname: "TestUser" },
    roomIds: [],
    ...overrides,
  };
}

describe("roomService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
  });

  // ── create() ────────────────────────────────────────────────────────

  describe("create()", () => {
    it("creates room with owner, default roles, and default channels", async () => {
      const room = makeRoom();
      mockUserExists.mockResolvedValue({ _id: "owner-1" });
      mockRoomExists.mockResolvedValue(false);
      mockRoomCreate.mockResolvedValue([room]);
      mockChannelInsertMany.mockResolvedValue([
        { _id: { toString: () => "ch-1" } },
        { _id: { toString: () => "ch-2" } },
        { _id: { toString: () => "ch-3" } },
      ]);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      const result = await roomService.create("Test Room", "A test room", "owner-1");

      expect(mockRoomCreate).toHaveBeenCalledWith(
        [expect.objectContaining({
          name: "Test Room",
          ownerId: "owner-1",
          memberIds: ["owner-1"],
          memberCount: 1,
        })],
        { session: mockSession }
      );
      expect(result.id).toBe("room-1");
      expect(mockSession.commitTransaction).toHaveBeenCalled();
    });

    it("generates unique invite code", async () => {
      const room = makeRoom();
      mockUserExists.mockResolvedValue({ _id: "owner-1" });
      // First code already exists, second is unique
      mockRoomExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mockRoomCreate.mockResolvedValue([room]);
      mockChannelInsertMany.mockResolvedValue([
        { _id: { toString: () => "ch-1" } },
        { _id: { toString: () => "ch-2" } },
        { _id: { toString: () => "ch-3" } },
      ]);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.create("Test Room", "Desc", "owner-1");

      // Room.exists called at least twice (first found duplicate, second was unique)
      expect(mockRoomExists.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("throws notFound when owner doesn't exist", async () => {
      mockUserExists.mockResolvedValue(null);

      await expect(
        roomService.create("Test Room", "Desc", "nonexistent-owner")
      ).rejects.toThrow("Owner not found");
    });

    it("throws badRequest when name is too short", async () => {
      await expect(
        roomService.create("A", "Desc", "owner-1")
      ).rejects.toThrow("Room name must be at least 2 characters");
    });
  });

  // ── getById() ───────────────────────────────────────────────────────

  describe("getById()", () => {
    it("returns room on success", async () => {
      const room = makeRoom();
      mockRoomFindById.mockReturnValue(chainable(room));

      const result = await roomService.getById("room-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("room-1");
    });

    it("throws notFound when room doesn't exist", async () => {
      mockRoomFindById.mockReturnValue(chainable(null));

      await expect(roomService.getById("nonexistent")).rejects.toThrow("Room not found");
    });
  });

  // ── join() ──────────────────────────────────────────────────────────

  describe("join()", () => {
    it("adds userId to memberIds with $addToSet", async () => {
      const room = makeRoom({ memberIds: ["owner-1"] });
      mockRoomFindById
        .mockReturnValueOnce(chainable(room)) // first findById for validation
        .mockReturnValueOnce(chainable(makeRoom({ memberIds: ["owner-1", "user-2"] }))); // after update (getById)
      mockUserExists.mockResolvedValue({ _id: "user-2" });
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.join("room-1", "user-2");

      expect(mockRoomFindByIdAndUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({
          $addToSet: { memberIds: "user-2" },
        }),
        { session: mockSession }
      );
    });

    it("uses atomic $inc for memberCount", async () => {
      const room = makeRoom({ memberIds: ["owner-1"] });
      mockRoomFindById
        .mockReturnValueOnce(chainable(room))
        .mockReturnValueOnce(chainable(makeRoom({ memberIds: ["owner-1", "user-2"], memberCount: 2 })));
      mockUserExists.mockResolvedValue({ _id: "user-2" });
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.join("room-1", "user-2");

      expect(mockRoomFindByIdAndUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({
          $inc: { memberCount: 1 },
        }),
        { session: mockSession }
      );
    });

    it("returns existing room if already a member", async () => {
      const room = makeRoom({ memberIds: ["owner-1", "user-2"] });
      // First call: join's select().lean() check, second call: getById's .lean()
      mockRoomFindById
        .mockReturnValueOnce(chainable(room))
        .mockReturnValueOnce(chainable(room));
      mockUserExists.mockResolvedValue({ _id: "user-2" });

      const result = await roomService.join("room-1", "user-2");

      // Should return early without calling update
      expect(mockRoomFindByIdAndUpdate).not.toHaveBeenCalled();
      expect(result.id).toBe("room-1");
    });

    it("throws if room is full (maxMembers)", async () => {
      const room = makeRoom({
        memberIds: Array.from({ length: 50 }, (_, i) => `user-${i}`),
        settings: { maxMembers: 50, isPublic: false, defaultRole: "role-member" },
      });
      mockRoomFindById.mockReturnValue(chainable(room));
      mockUserExists.mockResolvedValue({ _id: "new-user" });

      await expect(roomService.join("room-1", "new-user")).rejects.toThrow("Room is full");
    });

    it("throws notFound when room doesn't exist", async () => {
      mockRoomFindById.mockReturnValue(chainable(null));
      mockUserExists.mockResolvedValue({ _id: "user-1" });

      await expect(roomService.join("nonexistent", "user-1")).rejects.toThrow("Room not found");
    });

    it("emits member:joined event", async () => {
      const room = makeRoom({ memberIds: ["owner-1"] });
      mockRoomFindById
        .mockReturnValueOnce(chainable(room))
        .mockReturnValueOnce(chainable(makeRoom({ memberIds: ["owner-1", "user-2"] })));
      mockUserExists.mockResolvedValue({ _id: "user-2" });
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.join("room-1", "user-2");

      expect(mockEmit).toHaveBeenCalledWith("member:joined", { serverId: "room-1", userId: "user-2" });
    });
  });

  // ── leave() ─────────────────────────────────────────────────────────

  describe("leave()", () => {
    it("removes userId from memberIds", async () => {
      const room = makeRoom({ memberIds: ["owner-1", "user-2"], ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.leave("room-1", "user-2");

      expect(mockRoomFindByIdAndUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({
          $pull: { memberIds: "user-2" },
          $inc: { memberCount: -1 },
        }),
        { session: mockSession }
      );
    });

    it("transfers ownership if owner leaves and other members exist", async () => {
      const room = makeRoom({ memberIds: ["owner-1", "user-2"], ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));
      // transferOwnership internal findById
      mockRoomFindByIdAndUpdate
        .mockResolvedValueOnce(makeRoom({ ownerId: "user-2" })) // transfer ownership
        .mockResolvedValue(null); // leave update
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.leave("room-1", "owner-1");

      // First call should be transferOwnership setting new owner
      expect(mockRoomFindByIdAndUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({
          $set: expect.objectContaining({
            ownerId: "user-2",
          }),
        }),
        { new: true }
      );
    });

    it("deletes room if owner leaves and no other members", async () => {
      const room = makeRoom({ memberIds: ["owner-1"], ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));
      mockRoomFindByIdAndDelete.mockResolvedValue(null);
      mockChannelDeleteMany.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.leave("room-1", "owner-1");

      expect(mockRoomFindByIdAndDelete).toHaveBeenCalledWith("room-1", { session: mockSession });
      expect(mockChannelDeleteMany).toHaveBeenCalledWith({ roomId: "room-1" }, { session: mockSession });
    });

    it("throws badRequest if not a member", async () => {
      const room = makeRoom({ memberIds: ["owner-1"] });
      mockRoomFindById.mockReturnValue(chainable(room));

      await expect(roomService.leave("room-1", "nonmember")).rejects.toThrow("Not a member");
    });

    it("emits member:left event", async () => {
      const room = makeRoom({ memberIds: ["owner-1", "user-2"], ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.leave("room-1", "user-2");

      expect(mockEmit).toHaveBeenCalledWith("member:left", { serverId: "room-1", userId: "user-2" });
    });
  });

  // ── kick() ──────────────────────────────────────────────────────────

  describe("kick()", () => {
    it("removes target user and emits event", async () => {
      const room = makeRoom({
        memberIds: ["owner-1", "user-2"],
        ownerId: "owner-1",
      });
      mockRoomFindById.mockReturnValue(chainable(room));
      mockRoomFindByIdAndUpdate.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockResolvedValue(null);

      await roomService.kick("room-1", "owner-1", "user-2");

      expect(mockRoomFindByIdAndUpdate).toHaveBeenCalledWith(
        "room-1",
        expect.objectContaining({
          $pull: { memberIds: "user-2" },
          $inc: { memberCount: -1 },
        }),
        { session: mockSession }
      );
      expect(mockEmit).toHaveBeenCalledWith("member:left", { serverId: "room-1", userId: "user-2" });
    });

    it("throws forbidden if requester has no kick_members permission", async () => {
      const room = makeRoom({
        memberIds: ["owner-1", "user-2", "user-3"],
        ownerId: "owner-1",
        memberRoles: new Map([
          ["owner-1", ["role-owner"]],
          ["user-2", ["role-member"]], // member role has no kick_members
          ["user-3", ["role-member"]],
        ]),
      });
      mockRoomFindById.mockReturnValue(chainable(room));

      await expect(
        roomService.kick("room-1", "user-2", "user-3")
      ).rejects.toThrow("Missing permission: kick_members");
    });

    it("throws forbidden when trying to kick the owner", async () => {
      const room = makeRoom({ memberIds: ["owner-1", "admin-1"], ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));

      await expect(
        roomService.kick("room-1", "owner-1", "owner-1")
      ).rejects.toThrow("Cannot kick the owner");
    });

    it("throws badRequest when trying to kick yourself", async () => {
      const room = makeRoom({
        memberIds: ["owner-1", "admin-1"],
        ownerId: "owner-1",
        memberRoles: new Map([["admin-1", ["role-admin"]]]),
      });
      mockRoomFindById.mockReturnValue(chainable(room));

      await expect(
        roomService.kick("room-1", "admin-1", "admin-1")
      ).rejects.toThrow("Cannot kick yourself");
    });
  });

  // ── delete() ────────────────────────────────────────────────────────

  describe("delete()", () => {
    it("deletes room and all channels in transaction", async () => {
      const room = makeRoom({ ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));

      const channelLeanMock = vi.fn().mockResolvedValue([
        { _id: "ch-1" },
        { _id: "ch-2" },
      ]);
      mockChannelFind.mockReturnValue({ lean: channelLeanMock });
      mockRoomFindByIdAndDelete.mockResolvedValue(null);
      mockMessageDeleteMany.mockResolvedValue(null);
      mockChannelDeleteMany.mockResolvedValue(null);
      mockUserUpdateMany.mockResolvedValue(null);

      await roomService.delete("room-1", "owner-1");

      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockUserUpdateMany).toHaveBeenCalledWith(
        { roomIds: "room-1" },
        { $pull: { roomIds: "room-1" } },
        { session: mockSession }
      );
      expect(mockMessageDeleteMany).toHaveBeenCalledWith({ roomId: "room-1" }, { session: mockSession });
      expect(mockChannelDeleteMany).toHaveBeenCalledWith({ roomId: "room-1" }, { session: mockSession });
      expect(mockRoomFindByIdAndDelete).toHaveBeenCalledWith("room-1", { session: mockSession });
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it("throws forbidden when non-owner tries to delete", async () => {
      const room = makeRoom({ ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));

      await expect(
        roomService.delete("room-1", "other-user")
      ).rejects.toThrow("Only the owner can delete the room");
    });

    it("throws notFound when room doesn't exist", async () => {
      mockRoomFindById.mockReturnValue(chainable(null));

      await expect(roomService.delete("nonexistent", "owner-1")).rejects.toThrow("Room not found");
    });

    it("emits server:deleted event on success", async () => {
      const room = makeRoom({ ownerId: "owner-1" });
      mockRoomFindById.mockReturnValue(chainable(room));

      const channelLeanMock = vi.fn().mockResolvedValue([]);
      mockChannelFind.mockReturnValue({ lean: channelLeanMock });
      mockRoomFindByIdAndDelete.mockResolvedValue(null);
      mockMessageDeleteMany.mockResolvedValue(null);
      mockChannelDeleteMany.mockResolvedValue(null);
      mockUserUpdateMany.mockResolvedValue(null);

      await roomService.delete("room-1", "owner-1");

      expect(mockEmit).toHaveBeenCalledWith("server:deleted", { serverId: "room-1" });
    });
  });
});
