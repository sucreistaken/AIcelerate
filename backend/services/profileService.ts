import crypto from "crypto";
import { User, IUser } from "../models/User";
import { eventBus } from "../events/eventBus";
import { badRequest, notFound } from "../middleware/errorHandler";

function generateFriendCode(nickname: string): string {
  const tag = crypto.randomInt(1000, 10000).toString();
  const clean = nickname.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) || "User";
  return `${clean}#${tag}`;
}

// Profile shape returned to frontend (compatible with UserProfile interface)
function toProfile(user: any): any {
  const u = user.toJSON ? user.toJSON() : user;
  return {
    id: (u._id || u.id).toString(),
    nickname: u.profile?.nickname || "Unknown",
    avatar: u.profile?.avatar || "avatar-1",
    bio: u.profile?.bio || "",
    status: u.status || "offline",
    friendIds: u.friendIds || [],
    friendRequestsSent: (u.friendRequests || []).filter((r: any) => r.direction === "sent").map((r: any) => r.from),
    friendRequestsReceived: (u.friendRequests || []).filter((r: any) => r.direction === "received").map((r: any) => r.from),
    friendCode: u.friendCode || "",
    serverIds: u.roomIds || [],
    dmChannelIds: u.dmChannelIds || [],
    lastActiveAt: u.updatedAt || u.createdAt,
    createdAt: u.createdAt,
    settings: {
      notifyMentions: u.settings?.notifications ?? true,
      notifyDMs: u.settings?.notifications ?? true,
    },
  };
}

export const profileService = {
  // Profile is now backed by the User model.
  // This method returns a profile-shaped view for backward compat.

  async getById(id: string) {
    const user = await User.findById(id).select("-passwordHash");
    if (!user) throw notFound("Profile not found");
    return toProfile(user);
  },

  async getByIdOptional(id: string) {
    const user = await User.findById(id).select("-passwordHash");
    return user ? toProfile(user) : null;
  },

  /**
   * Setup profile for an authenticated user (called from ProfileSetup component).
   * Updates the User's profile fields (nickname, avatar) and generates a friend code.
   */
  async setupProfile(userId: string, nickname: string, avatar?: string) {
    if (!nickname || nickname.trim().length < 2) {
      throw badRequest("Nickname must be at least 2 characters");
    }

    let friendCode = generateFriendCode(nickname.trim());
    let attempts = 0;
    while (await User.exists({ friendCode, _id: { $ne: userId } }) && attempts < 100) {
      friendCode = generateFriendCode(nickname.trim());
      attempts++;
    }

    const updated = await User.findByIdAndUpdate(userId, {
      $set: {
        "profile.nickname": nickname.trim(),
        "profile.avatar": avatar || "avatar-1",
        friendCode,
        status: "online",
      },
    }, { new: true }).select("-passwordHash");

    if (!updated) throw notFound("User not found");
    return toProfile(updated);
  },

  async update(id: string, updates: Record<string, any>) {
    const user = await User.findById(id);
    if (!user) throw notFound("Profile not found");

    const set: any = {};
    if (updates.nickname) set["profile.nickname"] = updates.nickname;
    if (updates.avatar) set["profile.avatar"] = updates.avatar;
    if (updates.bio !== undefined) set["profile.bio"] = updates.bio;

    // Regenerate friend code on nickname change
    if (updates.nickname && updates.nickname !== user.profile.nickname) {
      let code = generateFriendCode(updates.nickname);
      let attempts = 0;
      while (await User.exists({ friendCode: code, _id: { $ne: id } }) && attempts < 100) {
        code = generateFriendCode(updates.nickname);
        attempts++;
      }
      set.friendCode = code;
    }

    const updated = await User.findByIdAndUpdate(id, { $set: set }, { new: true }).select("-passwordHash");
    if (!updated) throw notFound("Profile not found");
    return toProfile(updated);
  },

  async setStatus(id: string, status: string) {
    const updated = await User.findByIdAndUpdate(id, { $set: { status } }, { new: true }).select("-passwordHash");
    if (!updated) throw notFound("Profile not found");
    eventBus.emit("profile:statusChanged", { userId: id, status });
    return toProfile(updated);
  },

  async sendFriendRequest(fromId: string, friendCode: string) {
    const sender = await User.findById(fromId);
    if (!sender) throw notFound("Sender not found");

    const target = await User.findOne({ friendCode: new RegExp(`^${friendCode}$`, "i") });
    if (!target) throw notFound("User not found with that friend code");
    const targetId = target._id.toString();
    if (targetId === fromId) throw badRequest("Cannot add yourself");
    if (sender.friendIds.includes(targetId)) throw badRequest("Already friends");

    // Check existing requests
    const alreadySent = sender.friendRequests.some(
      (r) => r.from === targetId && (r as any).direction === "sent"
    );
    if (alreadySent) throw badRequest("Friend request already sent");

    // Add outgoing request to sender
    await User.findByIdAndUpdate(fromId, {
      $push: { friendRequests: { from: targetId, direction: "sent", createdAt: new Date() } },
    });

    // Add incoming request to target
    await User.findByIdAndUpdate(targetId, {
      $push: { friendRequests: { from: fromId, direction: "received", createdAt: new Date() } },
    });

    return { success: true, message: `Friend request sent to ${target.profile.nickname}` };
  },

  async acceptFriendRequest(userId: string, fromId: string) {
    // Add to both friendIds
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friendIds: fromId },
      $pull: { friendRequests: { from: fromId } },
    });

    await User.findByIdAndUpdate(fromId, {
      $addToSet: { friendIds: userId },
      $pull: { friendRequests: { from: userId } },
    });
  },

  async rejectFriendRequest(userId: string, fromId: string) {
    await User.findByIdAndUpdate(userId, {
      $pull: { friendRequests: { from: fromId } },
    });
    await User.findByIdAndUpdate(fromId, {
      $pull: { friendRequests: { from: userId } },
    });
  },

  async removeFriend(userId: string, friendId: string) {
    await User.findByIdAndUpdate(userId, { $pull: { friendIds: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friendIds: userId } });
  },

  async getFriends(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw notFound("Profile not found");

    // Single query instead of N+1
    const friends = await User.find(
      { _id: { $in: user.friendIds } },
      { passwordHash: 0 }
    ).lean();

    return friends.map((f: any) => toProfile(f));
  },

  async touchActive(id: string) {
    await User.findByIdAndUpdate(id, { $set: { updatedAt: new Date() } });
  },
};
