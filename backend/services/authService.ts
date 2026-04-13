import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/User";
import { env } from "../config/env";
import { RefreshToken } from "../models/RefreshToken";
import { cascadeDeleteUser } from "./adminService";
import { AppError, badRequest, notFound } from "../middleware/errorHandler";
import { redis, isRedisReady } from "../config/redis";
import { logger } from "../utils/logger";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// --- Password strength validation ---
function validatePasswordStrength(password: string): void {
  if (password.length < 8) throw badRequest("Password must be at least 8 characters");
  if (!/[A-Z]/.test(password)) throw badRequest("Password must contain at least one uppercase letter");
  if (!/[0-9]/.test(password)) throw badRequest("Password must contain at least one digit");
  if (!/[^A-Za-z0-9]/.test(password)) throw badRequest("Password must contain at least one special character");
}

// --- Login lockout (Redis-backed with in-memory fallback) ---
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_LOCKOUT_SEC = Math.ceil(LOGIN_LOCKOUT_MS / 1000);
const FALLBACK_MAX_ENTRIES = 10_000;

// Atomic Lua: increment failed attempts, set lockout if threshold reached
const RECORD_FAIL_LUA = `
  local key = KEYS[1]
  local maxAttempts = tonumber(ARGV[1])
  local lockoutMs = tonumber(ARGV[2])
  local nowMs = tonumber(ARGV[3])
  local ttlSec = tonumber(ARGV[4])

  local raw = redis.call('GET', key)
  local count = 0
  local lockedUntil = 0
  if raw then
    local entry = cjson.decode(raw)
    count = tonumber(entry.count) or 0
    lockedUntil = tonumber(entry.lockedUntil) or 0
  end
  count = count + 1
  if count >= maxAttempts then
    lockedUntil = nowMs + lockoutMs
  end
  redis.call('SET', key, cjson.encode({count=count, lockedUntil=lockedUntil}), 'EX', ttlSec)
  return {count, lockedUntil}
`;

// In-memory fallback for when Redis is unavailable (bounded)
const fallbackAttempts = new Map<string, { count: number; lockedUntil: number }>();
const _loginCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of fallbackAttempts) {
    if (entry.lockedUntil <= now) fallbackAttempts.delete(key);
  }
}, 10 * 60 * 1000);
_loginCleanup.unref();

function lockoutKey(email: string): string {
  return `lockout:${email}`;
}

async function checkLoginLockout(email: string): Promise<void> {
  if (isRedisReady()) {
    try {
      const raw = await redis.get(lockoutKey(email));
      if (!raw) return;
      const entry = JSON.parse(raw) as { count: number; lockedUntil: number };
      if (entry.count >= LOGIN_MAX_ATTEMPTS && entry.lockedUntil > Date.now()) {
        const retryMin = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
        throw new AppError(429, `Too many login attempts. Try again in ${retryMin} minute(s)`, "RATE_LIMITED");
      }
      return;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.warn({ err: (err as Error).message }, "Redis lockout check failed — falling back");
    }
  }

  // Fallback
  const entry = fallbackAttempts.get(email);
  if (!entry) return;
  if (entry.lockedUntil > Date.now() && entry.count >= LOGIN_MAX_ATTEMPTS) {
    const retryMin = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    throw new AppError(429, `Too many login attempts. Try again in ${retryMin} minute(s)`, "RATE_LIMITED");
  }
  if (entry.lockedUntil <= Date.now()) {
    fallbackAttempts.delete(email);
  }
}

async function recordFailedLogin(email: string): Promise<void> {
  if (isRedisReady()) {
    try {
      await redis.eval(
        RECORD_FAIL_LUA, 1, lockoutKey(email),
        LOGIN_MAX_ATTEMPTS, LOGIN_LOCKOUT_MS, Date.now(), LOGIN_LOCKOUT_SEC
      );
      return;
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "Redis lockout record failed — falling back");
    }
  }

  // Fallback (bounded)
  if (fallbackAttempts.size >= FALLBACK_MAX_ENTRIES && !fallbackAttempts.has(email)) return;
  const entry = fallbackAttempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  fallbackAttempts.set(email, entry);
}

async function clearFailedLogins(email: string): Promise<void> {
  if (isRedisReady()) {
    try {
      await redis.del(lockoutKey(email));
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "Redis lockout clear failed");
    }
  }
  fallbackAttempts.delete(email);
}

function generateFriendCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

function signAccessToken(userId: string, role = ""): string {
  return jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

async function createTokenPair(userId: string, role = "", session?: mongoose.ClientSession) {
  const accessToken = signAccessToken(userId, role);
  const refreshTokenStr = generateRefreshToken();

  // Store hashed refresh token in DB
  const hashedToken = crypto.createHash("sha256").update(refreshTokenStr).digest("hex");
  await RefreshToken.create([{
    userId,
    token: hashedToken,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  }], session ? { session } : {});

  return {
    token: accessToken,
    refreshToken: refreshTokenStr,
    expiresIn: ACCESS_TOKEN_EXPIRY,
  };
}

export const authService = {
  async register(email: string, password: string, nickname: string) {
    const existing = await User.exists({ email: email.toLowerCase().trim() });
    if (existing) throw new AppError(409, "Email already registered", "CONFLICT");

    validatePasswordStrength(password);

    const passwordHash = await bcrypt.hash(password, 12);
    const friendCode = generateFriendCode();

    // Transaction: create User + RefreshToken atomically
    const session = await mongoose.startSession();
    try {
      let result: { user: { id: string; email: string; profile: unknown; friendCode: string }; token: string; refreshToken: string; expiresIn: string };
      await session.withTransaction(async () => {
        const [user] = await User.create([{
          email: email.toLowerCase().trim(),
          passwordHash,
          profile: { nickname: nickname.trim(), avatar: "avatar-1" },
          friendCode,
        }], { session });

        const tokens = await createTokenPair(user._id.toString(), user.role || "", session);
        result = {
          user: { id: user._id.toString(), email: user.email, profile: user.profile, friendCode: user.friendCode },
          ...tokens,
        };
      });
      return result!;
    } finally {
      await session.endSession();
    }
  },

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    await checkLoginLockout(normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      await recordFailedLogin(normalizedEmail);
      throw new AppError(401, "Invalid email or password", "UNAUTHORIZED");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordFailedLogin(normalizedEmail);
      throw new AppError(401, "Invalid email or password", "UNAUTHORIZED");
    }

    await clearFailedLogins(normalizedEmail);
    const tokens = await createTokenPair(user._id.toString(), user.role || "");
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
    const hashedToken = crypto.createHash("sha256").update(refreshTokenStr).digest("hex");
    const stored = await RefreshToken.findOne({ token: hashedToken }).lean();
    if (!stored) throw new AppError(401, "Invalid refresh token", "UNAUTHORIZED");

    if (stored.expiresAt < new Date()) {
      await RefreshToken.findByIdAndDelete(stored._id);
      throw new AppError(401, "Refresh token expired", "UNAUTHORIZED");
    }

    const user = await User.findById(stored.userId).select("-passwordHash").lean();
    if (!user) {
      await RefreshToken.findByIdAndDelete(stored._id);
      throw notFound("User not found");
    }

    // Rotate: delete old + create new pair atomically
    let tokens!: { token: string; refreshToken: string; expiresIn: string };
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await RefreshToken.findByIdAndDelete(stored._id, { session });
        tokens = await createTokenPair(user._id.toString(), user.role || "", session);
      });
    } finally {
      await session.endSession();
    }

    return {
      user: { id: user._id.toString(), email: user.email, profile: user.profile, friendCode: user.friendCode, settings: user.settings },
      ...tokens,
    };
  },

  /**
   * Logout: invalidate refresh token.
   */
  async logout(refreshTokenStr: string) {
    const hashedToken = crypto.createHash("sha256").update(refreshTokenStr).digest("hex");
    await RefreshToken.deleteOne({ token: hashedToken });
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

    validatePasswordStrength(newPassword);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return { ok: true };
  },

  async deleteAccount(userId: string, password: string) {
    const user = await User.findById(userId);
    if (!user) throw notFound("User not found");

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, "Password is incorrect", "UNAUTHORIZED");

    await cascadeDeleteUser(userId);
    return { ok: true };
  },

  verifyToken(token: string): { userId: string; role: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; role?: string };
      return { userId: decoded.userId, role: decoded.role || "" };
    } catch {
      throw new AppError(401, "Invalid or expired token", "UNAUTHORIZED");
    }
  },

  async getUser(userId: string) {
    const user = await User.findById(userId).select("-passwordHash").lean();
    if (!user) throw notFound("User not found");
    return { ...user, id: String(user._id) };
  },
};
