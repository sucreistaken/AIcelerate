// admin/components/PermissionGate.tsx — Render children only if user has permission
import type { ReactNode } from "react";
import { usePermission } from "../hooks/usePermission";
import type { Permission } from "../types";

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
