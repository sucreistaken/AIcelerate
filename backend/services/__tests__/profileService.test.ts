import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (must be declared before imports) ---

vi.mock("../../config/env", () => ({
  env: { JWT_SECRET: "test-jwt-secret-key", GEMINI_API_KEY: "test" },
}));

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// --- User model mock ---
const mockUserFindById = vi.fn();
const mockUserFindByIdAndUpdate = vi.fn();
const mockUserFindOneResult = vi.fn();
const mockUserFind = vi.fn();
const mockUserExists = vi.fn();

// User.findOne(...).collation(...) chain
const mockUserFindOne = vi.fn(() => ({
  collation: vi.fn((..._args: any[]) => mockUserFindOneResult()),
}));

vi.mock("../../models/User", () => ({
  User: {
    findById: (...args: any[]) => mockUserFindById(...args),
    findByIdAndUpdate: (...args: any[]) => mockUserFindByIdAndUpdate(...args),
    findOne: (...args: any[]) => mockUserFindOne(...args),
    find: (...args: any[]) => mockUserFind(...args),
    exists: (...args: any[]) => mockUserExists(...args),
  },
}));

// --- EventBus mock ---
const mockEventBusEmit = vi.fn();

vi.mock("../../events/eventBus", () => ({
  eventBus: {
    emit: (...args: any[]) => mockEventBusEmit(...args),
  },
}));

// --- Mongoose session mock ---
const mockWithTransaction = vi.fn(async (fn: () => Promise<void>) => {
  await fn();
});
const mockSession = {
  startTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  abortTransaction: vi.fn(),
  endSession: vi.fn(),
  withTransaction: mockWithTransaction,
};

vi.mock("mongoose", () => ({
  default: {
    startSession: vi.fn(() => Promise.resolve(mockSession)),
  },
}));

// --- crypto mock for deterministic friend code generation ---
vi.mock("crypto", () => {
  const actual = require("crypto");
  return {
    default: {
      ...actual,
      randomInt: vi.fn((min: number, max: number) => min + Math.floor(Math.random() * (max - min))),
    },
    randomInt: vi.fn((min: number, max: number) => min + Math.floor(Math.random() * (max - min))),
  };
});

import { profileService } from "../profileService";
import { AppError } from "../../middleware/errorHandler";

// --- Helpers ---

function makeUser(overrides: any = {}) {
  const base = {
    _id: { toString: () => overrides.id || "user-1" },
    id: overrides.id || "user-1",
    email: overrides.email || "test@example.com",
    passwordHash: overrides.passwordHash || "hashed",
    profile: overrides.profile || { nickname: "TestUser", avatar: "avatar-1", bio: "" },
    friendCode: overrides.friendCode || "TestUser#1234",
    friendIds: overrides.friendIds || [],
    friendRequests: overrides.friendRequests || [],
    roomIds: overrides.roomIds || [],
    dmChannelIds: overrides.dmChannelIds || [],
    status: overrides.status || "online",
    settings: overrides.settings || { notifications: true },
    createdAt: overrides.createdAt || new Date("2025-01-01"),
    updatedAt: overrides.updatedAt || new Date("2025-01-01"),
    toJSON() {
      return { ...this };
    },
    ...overrides,
  };
  return base;
}

/** Creates an object that supports .select()/.lean()/.collation() chaining and is awaitable */
function chainable(val: any) {
  const obj: any = {};
  obj.select = vi.fn().mockReturnValue(obj);
  obj.lean = vi.fn().mockReturnValue(obj);
  obj.collation = vi.fn().mockReturnValue(obj);
  obj.sort = vi.fn().mockReturnValue(obj);
  obj.then = (resolve: any, reject?: any) => Promise.resolve(val).then(resolve, reject);
  return obj;
}

function makeSelectChain(user: any) {
  return chainable(user);
}

describe("profileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getById ────────────────────────────────────────────────

  describe("getById", () => {
    it("returns user profile", async () => {
      const user = makeUser({ id: "user-42" });
      mockUserFindById.mockReturnValue(makeSelectChain(user));

      const profile = await profileService.getById("user-42");

      expect(profile.id).toBe("user-42");
      expect(profile.nickname).toBe("TestUser");
      expect(profile.avatar).toBe("avatar-1");
      expect(profile.friendCode).toBe("TestUser#1234");
    });

    it("throws notFound (404) for missing user", async () => {
      mockUserFindById.mockReturnValue(makeSelectChain(null));

      await expect(profileService.getById("nonexistent")).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("excludes passwordHash from profile", async () => {
      const user = makeUser();
      const chain = chainable(user);
      mockUserFindById.mockReturnValue(chain);

      await profileService.getById("user-1");

      expect(chain.select).toHaveBeenCalledWith("-passwordHash");
    });
  });

  // ─── getByIdOptional ───────────────────────────────────────

  describe("getByIdOptional", () => {
    it("returns profile when user exists", async () => {
      mockUserFindById.mockReturnValue(makeSelectChain(makeUser()));

      const profile = await profileService.getByIdOptional("user-1");

      expect(profile).not.toBeNull();
      expect(profile!.id).toBe("user-1");
    });

    it("returns null when user does not exist", async () => {
      mockUserFindById.mockReturnValue(makeSelectChain(null));

      const profile = await profileService.getByIdOptional("nonexistent");

      expect(profile).toBeNull();
    });
  });

  // ─── setupProfile ──────────────────────────────────────────

  describe("setupProfile", () => {
    it("creates profile with nickname and friend code", async () => {
      const updatedUser = makeUser({ friendCode: "TestNick#5678" });
      mockUserExists.mockResolvedValue(null); // no collision
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(updatedUser));

      const profile = await profileService.setupProfile("user-1", "TestNick");

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        {
          $set: {
            "profile.nickname": "TestNick",
            "profile.avatar": "avatar-1",
            friendCode: expect.stringMatching(/.+#\d{4}$/),
            status: "online",
          },
        },
        { returnDocument: 'after' }
      );
      expect(profile.nickname).toBe("TestUser");
    });

    it("uses provided avatar", async () => {
      mockUserExists.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.setupProfile("user-1", "Nick", "avatar-5");

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          $set: expect.objectContaining({ "profile.avatar": "avatar-5" }),
        }),
        { returnDocument: 'after' }
      );
    });

    it("generates unique friend code (retries on collision)", async () => {
      // First call: collision exists, second: no collision
      mockUserExists
        .mockResolvedValueOnce({ _id: "other-user" }) // collision
        .mockResolvedValueOnce(null); // no collision
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.setupProfile("user-1", "Nick");

      // exists should have been called at least twice
      expect(mockUserExists.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("throws badRequest if nickname is too short", async () => {
      await expect(
        profileService.setupProfile("user-1", "A")
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws badRequest if nickname is empty", async () => {
      await expect(
        profileService.setupProfile("user-1", "")
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws notFound if user does not exist", async () => {
      mockUserExists.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(null));

      await expect(
        profileService.setupProfile("gone", "ValidNick")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("trims nickname whitespace", async () => {
      mockUserExists.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.setupProfile("user-1", "  Padded  ");

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          $set: expect.objectContaining({ "profile.nickname": "Padded" }),
        }),
        { returnDocument: 'after' }
      );
    });
  });

  // ─── sendFriendRequest ─────────────────────────────────────

  describe("sendFriendRequest", () => {
    it("creates bidirectional friend requests in transaction", async () => {
      const sender = makeUser({ id: "sender-1", friendIds: [], friendRequests: [] });
      const target = makeUser({ id: "target-1", friendCode: "Target#1234" });

      mockUserFindById.mockReturnValue(chainable(sender));
      mockUserFindOneResult.mockResolvedValue(target);
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      const result = await profileService.sendFriendRequest("sender-1", "Target#1234");

      expect(result.ok).toBe(true);

      // Verify two updates within transaction
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledTimes(2);

      // Outgoing request on sender
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "sender-1",
        {
          $push: {
            friendRequests: expect.objectContaining({
              from: "target-1",
              direction: "sent",
            }),
          },
        },
        { session: mockSession }
      );

      // Incoming request on target
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "target-1",
        {
          $push: {
            friendRequests: expect.objectContaining({
              from: "sender-1",
              direction: "received",
            }),
          },
        },
        { session: mockSession }
      );

      // Transaction should have been used
      expect(mockWithTransaction).toHaveBeenCalled();
    });

    it("throws notFound if sender not found", async () => {
      mockUserFindById.mockReturnValue(chainable(null));

      await expect(
        profileService.sendFriendRequest("gone", "Code#1234")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws notFound if target not found (invalid friend code)", async () => {
      mockUserFindById.mockReturnValue(chainable(makeUser()));
      mockUserFindOneResult.mockResolvedValue(null);

      await expect(
        profileService.sendFriendRequest("user-1", "BadCode#9999")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws badRequest if sending to self", async () => {
      const user = makeUser({ id: "user-1", friendCode: "Self#1234" });
      mockUserFindById.mockReturnValue(chainable(user));
      // findOne returns the same user (self)
      mockUserFindOneResult.mockResolvedValue(user);

      await expect(
        profileService.sendFriendRequest("user-1", "Self#1234")
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("throws badRequest if already friends", async () => {
      const sender = makeUser({ id: "sender-1", friendIds: ["target-1"], friendRequests: [] });
      const target = makeUser({ id: "target-1" });

      mockUserFindById.mockReturnValue(chainable(sender));
      mockUserFindOneResult.mockResolvedValue(target);

      await expect(
        profileService.sendFriendRequest("sender-1", "Target#1234")
      ).rejects.toMatchObject({ statusCode: 400 });
      await expect(
        profileService.sendFriendRequest("sender-1", "Target#1234")
      ).rejects.toThrow("Already friends");
    });

    it("throws badRequest if request already sent", async () => {
      const sender = makeUser({
        id: "sender-1",
        friendIds: [],
        friendRequests: [{ from: "target-1", direction: "sent", createdAt: new Date() }],
      });
      const target = makeUser({ id: "target-1" });

      mockUserFindById.mockReturnValue(chainable(sender));
      mockUserFindOneResult.mockResolvedValue(target);

      await expect(
        profileService.sendFriendRequest("sender-1", "Target#1234")
      ).rejects.toMatchObject({ statusCode: 400 });
      await expect(
        profileService.sendFriendRequest("sender-1", "Target#1234")
      ).rejects.toThrow("already sent");
    });

    it("uses case-insensitive collation for friend code lookup", async () => {
      const sender = makeUser({ id: "sender-1", friendIds: [], friendRequests: [] });
      const target = makeUser({ id: "target-1" });
      mockUserFindById.mockReturnValue(chainable(sender));
      mockUserFindOneResult.mockResolvedValue(target);
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.sendFriendRequest("sender-1", "Target#1234");

      // Verify findOne was called with the friend code
      const findOneArg = mockUserFindOne.mock.calls[0][0];
      expect(findOneArg.friendCode).toBe("Target#1234");

      // Verify .collation() was chained with case-insensitive options
      const collationMock = mockUserFindOne.mock.results[0].value.collation;
      expect(collationMock).toHaveBeenCalledWith({ locale: "en", strength: 2 });
    });

    it("ends session in finally block even on error", async () => {
      const sender = makeUser({ id: "sender-1", friendIds: [], friendRequests: [] });
      const target = makeUser({ id: "target-1" });
      mockUserFindById.mockReturnValue(chainable(sender));
      mockUserFindOneResult.mockResolvedValue(target);

      // Make the transaction fail
      mockWithTransaction.mockRejectedValueOnce(new Error("Transaction failed"));

      await expect(
        profileService.sendFriendRequest("sender-1", "Code#1234")
      ).rejects.toThrow("Transaction failed");

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ─── acceptFriendRequest ───────────────────────────────────

  describe("acceptFriendRequest", () => {
    it("adds to both users' friendIds and removes requests in transaction", async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.acceptFriendRequest("user-1", "from-user-2");

      expect(mockWithTransaction).toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledTimes(2);

      // Accepting user: add friend and remove request
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        {
          $addToSet: { friendIds: "from-user-2" },
          $pull: { friendRequests: { from: "from-user-2" } },
        },
        { session: mockSession }
      );

      // Requester: add friend and remove their request
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "from-user-2",
        {
          $addToSet: { friendIds: "user-1" },
          $pull: { friendRequests: { from: "user-1" } },
        },
        { session: mockSession }
      );
    });

    it("ends session after transaction", async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.acceptFriendRequest("user-1", "user-2");

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ─── rejectFriendRequest ───────────────────────────────────

  describe("rejectFriendRequest", () => {
    it("removes friend request from both users", async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.rejectFriendRequest("user-1", "from-user-2");

      // Remove incoming request from rejector (with session)
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("user-1", {
        $pull: { friendRequests: { from: "from-user-2" } },
      }, expect.objectContaining({ session: expect.anything() }));

      // Remove outgoing request from sender (with session)
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("from-user-2", {
        $pull: { friendRequests: { from: "user-1" } },
      }, expect.objectContaining({ session: expect.anything() }));
    });

    it("does not add to friendIds", async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.rejectFriendRequest("user-1", "from-user-2");

      // None of the calls should include $addToSet with friendIds
      for (const call of mockUserFindByIdAndUpdate.mock.calls) {
        const updateObj = call[1];
        expect(updateObj.$addToSet).toBeUndefined();
      }
    });
  });

  // ─── removeFriend ──────────────────────────────────────────

  describe("removeFriend", () => {
    it("removes from both users' friendIds within a transaction", async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue({});

      await profileService.removeFriend("user-1", "friend-2");

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledTimes(2);

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("user-1", {
        $pull: { friendIds: "friend-2" },
      }, { session: mockSession });

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith("friend-2", {
        $pull: { friendIds: "user-1" },
      }, { session: mockSession });

      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  // ─── getFriends ────────────────────────────────────────────

  describe("getFriends", () => {
    it("returns list of friend profiles", async () => {
      const user = makeUser({ friendIds: ["friend-1", "friend-2"] });
      mockUserFindById.mockReturnValue(chainable(user));

      const friend1 = makeUser({ id: "friend-1", profile: { nickname: "Alice", avatar: "avatar-2", bio: "" } });
      const friend2 = makeUser({ id: "friend-2", profile: { nickname: "Bob", avatar: "avatar-3", bio: "" } });

      mockUserFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([friend1, friend2]),
      });

      const friends = await profileService.getFriends("user-1");

      expect(friends).toHaveLength(2);
      expect(friends[0].nickname).toBe("Alice");
      expect(friends[1].nickname).toBe("Bob");

      // Should query with $in for all friendIds
      expect(mockUserFind).toHaveBeenCalledWith(
        { _id: { $in: ["friend-1", "friend-2"] } },
        { passwordHash: 0 }
      );
    });

    it("returns empty array when user has no friends", async () => {
      const user = makeUser({ friendIds: [] });
      mockUserFindById.mockReturnValue(chainable(user));
      mockUserFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const friends = await profileService.getFriends("user-1");

      expect(friends).toEqual([]);
    });

    it("throws notFound if user not found", async () => {
      mockUserFindById.mockReturnValue(chainable(null));

      await expect(profileService.getFriends("gone")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ─── update ────────────────────────────────────────────────

  describe("update", () => {
    it("updates nickname, avatar, and bio", async () => {
      const user = makeUser({ profile: { nickname: "Old", avatar: "avatar-1" } });
      mockUserFindById.mockReturnValue(chainable(user));
      mockUserExists.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.update("user-1", {
        nickname: "New",
        avatar: "avatar-5",
        bio: "Hello",
      });

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        {
          $set: expect.objectContaining({
            "profile.nickname": "New",
            "profile.avatar": "avatar-5",
            "profile.bio": "Hello",
          }),
        },
        { returnDocument: 'after' }
      );
    });

    it("regenerates friend code on nickname change", async () => {
      const user = makeUser({ profile: { nickname: "Old" } });
      mockUserFindById.mockReturnValue(chainable(user));
      mockUserExists.mockResolvedValue(null);
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.update("user-1", { nickname: "NewName" });

      const updateArg = mockUserFindByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$set.friendCode).toBeDefined();
      expect(updateArg.$set.friendCode).toMatch(/.+#\d{4}$/);
    });

    it("does not regenerate friend code when nickname unchanged", async () => {
      const user = makeUser({ profile: { nickname: "Same" } });
      mockUserFindById.mockReturnValue(chainable(user));
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(makeUser()));

      await profileService.update("user-1", { nickname: "Same" });

      const updateArg = mockUserFindByIdAndUpdate.mock.calls[0][1];
      expect(updateArg.$set.friendCode).toBeUndefined();
    });

    it("throws notFound if user not found on initial lookup", async () => {
      mockUserFindById.mockReturnValue(chainable(null));

      await expect(
        profileService.update("gone", { nickname: "X" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("throws notFound if findByIdAndUpdate returns null", async () => {
      mockUserFindById.mockReturnValue(chainable(makeUser()));
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(null));

      await expect(
        profileService.update("user-1", { bio: "test" })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ─── setStatus ─────────────────────────────────────────────

  describe("setStatus", () => {
    it("updates status and emits event", async () => {
      const user = makeUser({ status: "online" });
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(user));

      await profileService.setStatus("user-1", "dnd");

      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "user-1",
        { $set: { status: "dnd" } },
        { returnDocument: 'after' }
      );
      expect(mockEventBusEmit).toHaveBeenCalledWith("profile:statusChanged", {
        userId: "user-1",
        status: "dnd",
      });
    });

    it("throws notFound if user not found", async () => {
      mockUserFindByIdAndUpdate.mockReturnValue(makeSelectChain(null));

      await expect(
        profileService.setStatus("gone", "online")
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
