// admin/hooks/usePermission.ts — Permission checking hooks
import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../../stores/authStore";
import { adminApi } from "../services/adminApi";
import type { Permission, Role } from "../types";

const isDev = import.meta.env.DEV;

// Module-level cache for roles
let cachedRoles: Role[] | null = null;
let rolesFetchPromise: Promise<Role[]> | null = null;

function fetchRolesOnce(): Promise<Role[]> {
  if (cachedRoles) return Promise.resolve(cachedRoles);
  if (rolesFetchPromise) return rolesFetchPromise;

  rolesFetchPromise = adminApi
    .get<Role[]>("/roles")
    .then((roles) => {
      cachedRoles = roles;
      rolesFetchPromise = null;
      return roles;
    })
    .catch((err) => {
      rolesFetchPromise = null;
      throw err;
    });

  return rolesFetchPromise;
}

export function useAdminRoles(): { roles: Role[]; loading: boolean } {
  const [roles, setRoles] = useState<Role[]>(cachedRoles ?? []);
  const [loading, setLoading] = useState(!cachedRoles);

  useEffect(() => {
    if (cachedRoles) {
      setRoles(cachedRoles);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchRolesOnce()
      .then((r) => {
        if (!cancelled) {
          setRoles(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, loading };
}

function getUserRole(
  user: ReturnType<typeof useAuthStore.getState>["user"],
  roles: Role[]
): Role | null {
  if (!user) return null;

  // Check if user has an adminRole field (extended AuthUser)
  const userAny = user as unknown as Record<string, unknown>;
  const roleName =
    (userAny.adminRole as string) ?? (userAny.role as string) ?? null;

  if (!roleName) return null;

  return roles.find((r) => r.name === roleName) ?? null;
}

export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  const { roles } = useAdminRoles();

  return useMemo(() => {
    if (isDev) return true;

    const role = getUserRole(user, roles);
    if (!role) return false;

    if (role.name === "admin") return true;

    return role.permissions.includes(permission);
  }, [user, roles, permission]);
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const user = useAuthStore((s) => s.user);
  const { roles } = useAdminRoles();

  return useMemo(() => {
    if (isDev) return true;

    const role = getUserRole(user, roles);
    if (!role) return false;

    if (role.name === "admin") return true;

    return permissions.some((p) => role.permissions.includes(p));
  }, [user, roles, permissions]);
}

export function useIsAdmin(): boolean {
  const user = useAuthStore((s) => s.user);
  const { roles } = useAdminRoles();

  return useMemo(() => {
    if (isDev) return true;

    const role = getUserRole(user, roles);
    return role?.name === "admin";
  }, [user, roles]);
}
