import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name)!;
}

// Cleanup old entries every 5 minutes (unref to not block shutdown)
const _rlCleanup = setInterval(() => {
  const now = Date.now();
  for (const [name, store] of stores) {
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
    // Remove empty stores to prevent unbounded growth
    if (store.size === 0) stores.delete(name);
  }
}, 5 * 60 * 1000);
_rlCleanup.unref();

export function rateLimiter(
  name: string,
  maxRequests: number,
  windowMs: number
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prefer authenticated userId (tamper-proof), fall back to IP
    const key = (req as any).user?.userId || req.ip || "unknown";
    const store = getStore(name);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.status(429).json({
        error: "Too many requests",
        retryAfter,
      });
      return;
    }

    entry.count++;
    next();
  };
}

// Socket rate limiter (returns boolean)
export function checkSocketRateLimit(
  name: string,
  userId: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const store = getStore(`socket:${name}`);
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || entry.resetAt <= now) {
    store.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}
