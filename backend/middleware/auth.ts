import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";
import { User } from "../models/User";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

// In-memory role cache: userId → { role, cachedAt }
// 30s TTL — role changes reflected within 30 seconds
const ROLE_CACHE_TTL_MS = 30_000;
const ROLE_CACHE_MAX = 200;
const roleCache = new Map<string, { role: string; cachedAt: number }>();

async function getFreshRole(userId: string, jwtRole: string): Promise<string> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < ROLE_CACHE_TTL_MS) {
    return cached.role;
  }

  try {
    const dbUser = await User.findById(userId).select("role").lean();
    const role = dbUser?.role || "";

    // Evict oldest if cache full
    if (roleCache.size >= ROLE_CACHE_MAX) {
      const firstKey = roleCache.keys().next().value;
      if (firstKey !== undefined) roleCache.delete(firstKey);
    }
    roleCache.set(userId, { role, cachedAt: Date.now() });
    return role;
  } catch {
    // DB unreachable — fall back to JWT role
    return jwtRole;
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, error: "Authorization header required", code: "UNAUTHORIZED" });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = authService.verifyToken(token);
    const role = await getFreshRole(decoded.userId, decoded.role);
    req.user = { userId: decoded.userId, role };
    next();
  } catch (err: unknown) {
    const message = (err instanceof Error && err.message) ? err.message : "Invalid token";
    res.status(401).json({ ok: false, error: message, code: "UNAUTHORIZED" });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const decoded = authService.verifyToken(header.slice(7));
      const role = await getFreshRole(decoded.userId, decoded.role);
      req.user = { userId: decoded.userId, role };
    } catch {
      // Invalid token, continue without auth
    }
  }
  next();
}
