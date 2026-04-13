import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { redis, isRedisReady } from "../config/redis";
import { logger } from "../utils/logger";

// ── Lua script: atomic fixed-window INCR + EXPIRE ─────────────────────────────
const RATE_LIMIT_LUA = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])

  local current = redis.call('INCR', key)
  if current == 1 then
    redis.call('EXPIRE', key, window)
  end

  if current > limit then
    local ttl = redis.call('TTL', key)
    return {0, ttl}
  end

  return {1, -1}
`;

// ── In-memory fallback (used when Redis is unavailable) ───────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const FALLBACK_MAX_ENTRIES = 50_000;
const fallbackStores = new Map<string, Map<string, RateLimitEntry>>();

function getFallbackStore(name: string): Map<string, RateLimitEntry> {
  if (!fallbackStores.has(name)) fallbackStores.set(name, new Map());
  return fallbackStores.get(name)!;
}

// Cleanup fallback entries every 5 minutes
const _rlCleanup = setInterval(() => {
  const now = Date.now();
  for (const [name, store] of fallbackStores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
    if (store.size === 0) fallbackStores.delete(name);
  }
}, 5 * 60 * 1000);
_rlCleanup.unref();

function checkFallback(name: string, key: string, maxRequests: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const store = getFallbackStore(name);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Bound the store to prevent memory exhaustion under DDoS
    if (store.size >= FALLBACK_MAX_ENTRIES && !store.has(key)) {
      return { allowed: true, retryAfter: 0 };
    }
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

// ── Redis-backed check ────────────────────────────────────────────────────────
async function checkRedis(name: string, key: string, maxRequests: number, windowSec: number): Promise<{ allowed: boolean; retryAfter: number }> {
  const redisKey = `rl:${name}:${key}`;
  const result = await redis.eval(RATE_LIMIT_LUA, 1, redisKey, maxRequests, windowSec) as [number, number];
  const [allowed, ttl] = result;
  return { allowed: allowed === 1, retryAfter: ttl > 0 ? ttl : 0 };
}

// ── Express middleware ────────────────────────────────────────────────────────
export function rateLimiter(
  name: string,
  maxRequests: number,
  windowMs: number
) {
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const key = req.user?.userId || req.ip || "unknown";

    let result: { allowed: boolean; retryAfter: number };

    if (isRedisReady()) {
      try {
        result = await checkRedis(name, key, maxRequests, windowSec);
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "Redis rate limit failed — falling back to in-memory");
        result = checkFallback(name, key, maxRequests, windowMs);
      }
    } else {
      result = checkFallback(name, key, maxRequests, windowMs);
    }

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      res.status(429).json({
        ok: false,
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter: result.retryAfter,
      });
      return;
    }

    next();
  };
}

// ── Socket rate limiter ───────────────────────────────────────────────────────
export async function checkSocketRateLimit(
  name: string,
  userId: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const windowSec = Math.ceil(windowMs / 1000);

  if (isRedisReady()) {
    try {
      const result = await checkRedis(`socket:${name}`, userId, maxRequests, windowSec);
      return result.allowed;
    } catch {
      // Fall through to in-memory
    }
  }

  return checkFallback(`socket:${name}`, userId, maxRequests, windowMs).allowed;
}
