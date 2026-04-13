import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockRoomFind = vi.fn();
const mockRoomFindByIdAndUpdate = vi.fn();
const mockRoomFindByIdAndDelete = vi.fn();
const mockRoomUpdateMany = vi.fn();
const mockRoomBulkWrite = vi.fn();
const mockRoomDeleteMany = vi.fn();
vi.mock("../../models/Room", () => ({
  Room: {
    find: (...a: unknown[]) => mockRoomFind(...a),
    findByIdAndUpdate: (...a: unknown[]) => mockRoomFindByIdAndUpdate(...a),
    findByIdAndDelete: (...a: unknown[]) => mockRoomFindByIdAndDelete(...a),
    updateMany: (...a: unknown[]) => mockRoomUpdateMany(...a),
    bulkWrite: (...a: unknown[]) => mockRoomBulkWrite(...a),
    deleteMany: (...a: unknown[]) => mockRoomDeleteMany(...a),
  },
}));

const mockMessageUpdateMany = vi.fn();
const mockMessageDeleteMany = vi.fn();
vi.mock("../../models/Message", () => ({
  Message: {
    updateMany: (...a: unknown[]) => mockMessageUpdateMany(...a),
    deleteMany: (...a: unknown[]) => mockMessageDeleteMany(...a),
  },
}));

const mockChannelDeleteMany = vi.fn();
vi.mock("../../models/Channel", () => ({
  Channel: { deleteMany: (...a: unknown[]) => mockChannelDeleteMany(...a) },
}));

const mockUserUpdateMany = vi.fn();
const mockUserFindByIdAndDelete = vi.fn();
vi.mock("../../models/User", () => ({
  User: {
    updateMany: (...a: unknown[]) => mockUserUpdateMany(...a),
    findByIdAndDelete: (...a: unknown[]) => mockUserFindByIdAndDelete(...a),
  },
}));

const mockRefreshTokenDeleteMany = vi.fn();
vi.mock("../../models/RefreshToken", () => ({
  RefreshToken: { deleteMany: (...a: unknown[]) => mockRefreshTokenDeleteMany(...a) },
}));

const mockNotificationDeleteMany = vi.fn();
vi.mock("../../models/Notification", () => ({
  Notification: { deleteMany: (...a: unknown[]) => mockNotificationDeleteMany(...a) },
}));

const mockXpDeleteMany = vi.fn();
vi.mock("../../models/Xp", () => ({
  XpModel: { deleteMany: (...a: unknown[]) => mockXpDeleteMany(...a) },
}));

const mockSprintDeleteMany = vi.fn();
vi.mock("../../models/Sprint", () => ({
  SprintModel: { deleteMany: (...a: unknown[]) => mockSprintDeleteMany(...a) },
}));

const mockScheduleDeleteMany = vi.fn();
vi.mock("../../models/Schedule", () => ({
  ScheduleModel: { deleteMany: (...a: unknown[]) => mockScheduleDeleteMany(...a) },
}));

const mockGlobalMemoryDeleteMany = vi.fn();
vi.mock("../../models/GlobalMemory", () => ({
  GlobalMemoryModel: { deleteMany: (...a: unknown[]) => mockGlobalMemoryDeleteMany(...a) },
}));

const mockWeaknessDeleteMany = vi.fn();
vi.mock("../../models/Weakness", () => ({
  WeaknessModel: { deleteMany: (...a: unknown[]) => mockWeaknessDeleteMany(...a) },
}));

const mockAppNotifDeleteMany = vi.fn();
vi.mock("../../models/AppNotification", () => ({
  AppNotificationModel: { deleteMany: (...a: unknown[]) => mockAppNotifDeleteMany(...a) },
}));

// ── Session mock ───────────────────────────────────────────────────────────
const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => fn());
const mockSession = {
  withTransaction: mockWithTransaction,
  endSession: vi.fn(),
};

vi.mock("mongoose", () => ({
  default: { startSession: vi.fn(async () => mockSession) },
}));

import { cascadeDeleteUser } from "../adminService";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Creates a chainable object that supports .lean() and resolves to val */
function chainable(val: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {};
  obj.lean = vi.fn().mockReturnValue(obj);
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(val).then(resolve);
  return obj;
}

function setupDefaultMocks() {
  mockRoomFind.mockReturnValue(chainable([]));
  mockRoomUpdateMany.mockResolvedValue({});
  mockRoomBulkWrite.mockResolvedValue({});
  mockRoomDeleteMany.mockResolvedValue({});
  mockMessageUpdateMany.mockResolvedValue({});
  mockMessageDeleteMany.mockResolvedValue({});
  mockUserUpdateMany.mockResolvedValue({});
  mockUserFindByIdAndDelete.mockResolvedValue({});
  mockRefreshTokenDeleteMany.mockResolvedValue({});
  mockNotificationDeleteMany.mockResolvedValue({});
  mockXpDeleteMany.mockResolvedValue({});
  mockSprintDeleteMany.mockResolvedValue({});
  mockScheduleDeleteMany.mockResolvedValue({});
  mockGlobalMemoryDeleteMany.mockResolvedValue({});
  mockWeaknessDeleteMany.mockResolvedValue({});
  mockAppNotifDeleteMany.mockResolvedValue({});
}

describe("cascadeDeleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("starts own session and transaction when no session provided", async () => {
    await cascadeDeleteUser("user-1");

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it("soft-deletes messages with [deleted user] placeholder", async () => {
    await cascadeDeleteUser("user-1");

    expect(mockMessageUpdateMany).toHaveBeenCalledWith(
      { authorId: "user-1" },
      { $set: { deleted: true, content: "[deleted user]" } },
      { session: mockSession }
    );
  });

  it("removes user from all friend lists", async () => {
    await cascadeDeleteUser("user-1");

    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      { friendIds: "user-1" },
      { $pull: { friendIds: "user-1", friendRequests: { from: "user-1" } } },
      { session: mockSession }
    );
  });

  it("deletes refresh tokens", async () => {
    await cascadeDeleteUser("user-1");
    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, { session: mockSession });
  });

  it("transfers room ownership for rooms with other members", async () => {
    mockRoomFind.mockReturnValue(chainable([{
      _id: "room-1",
      memberIds: ["user-1", "member-2"],
    }]));
    mockRoomBulkWrite.mockResolvedValue({});

    await cascadeDeleteUser("user-1");

    expect(mockRoomBulkWrite).toHaveBeenCalledWith(
      [expect.objectContaining({
        updateOne: expect.objectContaining({
          filter: { _id: "room-1" },
          update: expect.objectContaining({
            $set: expect.objectContaining({ ownerId: "member-2" }),
            $pull: { memberIds: "user-1" },
          }),
        }),
      })],
      { session: mockSession }
    );
  });

  it("cascade-deletes solo rooms (messages, channels, room)", async () => {
    mockRoomFind.mockReturnValue(chainable([{
      _id: "room-solo",
      memberIds: ["user-1"],
    }]));
    mockMessageDeleteMany.mockResolvedValue({});
    mockChannelDeleteMany.mockResolvedValue({});
    mockRoomDeleteMany.mockResolvedValue({});

    await cascadeDeleteUser("user-1");

    expect(mockMessageDeleteMany).toHaveBeenCalledWith({ roomId: { $in: ["room-solo"] } }, { session: mockSession });
    expect(mockChannelDeleteMany).toHaveBeenCalledWith({ roomId: { $in: ["room-solo"] } }, { session: mockSession });
    expect(mockRoomDeleteMany).toHaveBeenCalledWith({ _id: { $in: ["room-solo"] } }, { session: mockSession });
  });

  it("deletes all orphan study collections (Xp, Sprint, Schedule, GlobalMemory, Weakness, AppNotification)", async () => {
    await cascadeDeleteUser("user-1");

    const opts = { session: mockSession };
    expect(mockXpDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
    expect(mockSprintDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
    expect(mockScheduleDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
    expect(mockGlobalMemoryDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
    expect(mockWeaknessDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
    expect(mockAppNotifDeleteMany).toHaveBeenCalledWith({ userId: "user-1" }, opts);
  });

  it("deletes the user document as final step", async () => {
    await cascadeDeleteUser("user-1");
    expect(mockUserFindByIdAndDelete).toHaveBeenCalledWith("user-1", { session: mockSession });
  });

  it("does not end session when external session is provided", async () => {
    const externalSession = { withTransaction: vi.fn(), endSession: vi.fn() };
    // When external session is provided, run() is called directly without withTransaction
    await cascadeDeleteUser("user-1", externalSession as never);

    expect(externalSession.endSession).not.toHaveBeenCalled();
  });
});
