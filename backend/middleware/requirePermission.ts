import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { User } from "../models/User";
import { roleRepo } from "../repositories/roleRepo";
import { forbidden } from "./errorHandler";
import type { Permission, Role } from "../types/admin";

// Simple in-memory role cache to avoid re-reading JSON on every request
// Max 50 entries to prevent unbounded growth
const ROLE_CACHE_MAX = 50;
const roleCache = new Map<string, { role: Role; cachedAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

export function clearRoleCache(): void {
  roleCache.clear();
}

async function getCachedRole(roleName: string): Promise<Role | null> {
  const cached = roleCache.get(roleName);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.role;
  }
  // Evict expired entries on access to keep cache bounded
  if (cached) roleCache.delete(roleName);
  if (roleCache.size >= ROLE_CACHE_MAX) {
    const firstKey = roleCache.keys().next().value;
    if (firstKey !== undefined) roleCache.delete(firstKey);
  }
  const role = await roleRepo.findByName(roleName);
  if (role) {
    roleCache.set(roleName, { role, cachedAt: Date.now() });
  }
  return role;
}

/**
 * Middleware factory that checks if the authenticated user has ALL of the
 * specified permissions.  The "admin" role bypasses all permission checks.
 */
export function requirePermission(...permissions: Permission[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw forbidden("Authentication required");
      }

      const user = await User.findById(userId).select("role");
      if (!user || !user.role) {
        throw forbidden("No admin role assigned");
      }

      const roleName = user.role;

      // Admin role bypasses all permission checks
      if (roleName === "admin") {
        return next();
      }

      const role = await getCachedRole(roleName);
      if (!role) {
        throw forbidden(`Role "${roleName}" not found`);
      }

      const hasAll = permissions.every((p) => role.permissions.includes(p));
      if (!hasAll) {
        throw forbidden("Insufficient permissions");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
