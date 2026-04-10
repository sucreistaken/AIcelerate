import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User, IUser } from "../models/User";
import { Room } from "../models/Room";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { Notification } from "../models/Notification";
import { env } from "../config/env";
import { RefreshToken } from "../models/RefreshToken";
import { AppError, badRequest, notFound, forbidden } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateFriendCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

async function createTokenPair(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshTokenStr = generateRefreshToken();

  // Store refresh token in DB
  await RefreshToken.create({
    userId,
    token: refreshTokenStr,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  return {
    token: accessToken,
    refreshToken: refreshTokenStr,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

export const authService = {
  async register(email: string, password: string, nickname: string) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) throw new AppError(409, "Email already registered", "CONFLICT");

    if (password.length < 6) throw badRequest("Password must be at least 6 characters");

    const passwordHash = await bcrypt.hash(password, 12);
    const friendCode = generateFriendCode();

    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      profile: { nickname: nickname.trim(), avatar: "avatar-1" },
      friendCode,
    });

    const tokens = await createTokenPair(user._id.toString());
    return {
      user: { id: user._id.toString(), email: user.email, profile: user.profile, friendCode: user.friendCode },
      ...tokens,
    };
  },

  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw new AppError(401, "Invalid email or password", "UNAUTHORIZED");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, "Invalid email or password", "UNAUTHORIZED");

    const tokens = await createTokenPair(user._id.toString());
    return {
      user: { id: user._id.toString(), email: user.email, profile: user.profile, friendCode: user.friendCode, settings: user.settings },
      ...tokens,
    };
  },

  /**
   * Refresh access token using a valid refresh token.
   * Implements rotation: old refresh token is consumed, new one issued.
   */
  async refreshToken(refreshTokenStr: string) {
    const stored = await RefreshToken.findOne({ token: refreshTokenStr });
    if (!stored) throw new AppError(401, "Invalid refresh token", "UNAUTHORIZED");

    if (stored.expiresAt < new Date()) {
      await RefreshToken.findByIdAndDelete(stored._id);
      throw new AppError(401, "Refresh token expired", "UNAUTHORIZED");
    }

    const user = await User.findById(stored.userId).select("-passwordHash");
    if (!user) {
      await RefreshToken.findByIdAndDelete(stored._id);
      throw notFound("User not found");
    }

    // Rotate: delete old, create new pair
    await RefreshToken.findByIdAndDelete(stored._id);
    const tokens = await createTokenPair(user._id.toString());

    return {
      user: { id: user._id.toString(), email: user.email, profile: user.profile, friendCode: user.friendCode, settings: user.settings },
      ...tokens,
    };
  },

  /**
   * Logout: invalidate refresh token.
   */
  async logout(refreshTokenStr: string) {
    await RefreshToken.deleteOne({ token: refreshTokenStr });
    return { ok: true };
  },

  /**
   * Logout from all devices: delete all refresh tokens for user.
   */
  async logoutAll(userId: string) {
    await RefreshToken.deleteMany({ userId });
    return { ok: true };
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(401, "Current password is incorrect", "UNAUTHORIZED");

    if (newPassword.length < 6) throw badRequest("New password must be at least 6 characters");

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return { ok: true };
  },

  async deleteAccount(userId: string, password: string) {
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, "Password is incorrect", "UNAUTHORIZED");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Transfer ownership of owned rooms to oldest member, or delete if solo
      const ownedRooms = await Room.find({ ownerId: userId }, null, { session });
      for (const room of ownedRooms) {
        const otherMembers = room.memberIds.filter((id: string) => id !== userId);
        if (otherMembers.length > 0) {
          // Transfer to oldest member
          const newOwner = otherMembers[0];
          await Room.findByIdAndUpdate(room._id, {
            $set: {
              ownerId: newOwner,
              [`memberRoles.${newOwner}`]: ["role-owner"],
            },
            $pull: { memberIds: userId },
            $unset: { [`memberRoles.${userId}`]: "" },
            $inc: { memberCount: -1 },
          }, { session });
        } else {
          // Solo room — cascade delete
          const channelIds = await Channel.find({ roomId: room._id.toString() }, { _id: 1 }, { session }).lean();
          await Message.deleteMany({ roomId: room._id.toString() }, { session });
          await Channel.deleteMany({ roomId: room._id.toString() }, { session });
          await Room.findByIdAndDelete(room._id, { session });
        }
      }

      // 2. Leave all rooms where member (not owner — already handled above)
      await Room.updateMany(
        { memberIds: userId, ownerId: { $ne: userId } },
        { $pull: { memberIds: userId }, $unset: { [`memberRoles.${userId}`]: "" }, $inc: { memberCount: -1 } },
        { session }
      );

      // 3. Soft-delete all messages (preserve conversation context)
      await Message.updateMany(
        { authorId: userId },
        { $set: { deleted: true, content: "[hesap silindi]" } },
        { session }
      );

      // 4. Delete notifications
      await Notification.deleteMany({ userId }, { session });

      // 5. Remove from all friend lists
      await User.updateMany(
        { friendIds: userId },
        { $pull: { friendIds: userId, friendRequests: { from: userId } } },
        { session }
      );

      // 6. Delete the user
      await User.findByIdAndDelete(userId, { session });

      await session.commitTransaction();
      logger.info({ userId }, "Account deleted with full cascade");
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return { ok: true };
  },

  verifyToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      return decoded;
    } catch {
      throw new AppError(401, "Invalid or expired token", "UNAUTHORIZED");
    }
  },

  async getUser(userId: string) {
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) throw notFound("User not found");
    return user;
  },
};
