// admin/types/permissions.ts — Admin panel types (mirrors backend/types/admin.ts)

export type Permission =
  | "users:read"
  | "users:write"
  | "users:delete"
  | "courses:read"
  | "courses:write"
  | "courses:delete"
  | "lessons:read"
  | "lessons:write"
  | "lessons:delete"
  | "roles:read"
  | "roles:write"
  | "roles:delete"
  | "settings:read"
  | "settings:write"
  | "audit:read"
  | "notifications:write"
  | "stats:read";

export const ALL_PERMISSIONS: Permission[] = [
  "users:read",
  "users:write",
  "users:delete",
  "courses:read",
  "courses:write",
  "courses:delete",
  "lessons:read",
  "lessons:write",
  "lessons:delete",
  "roles:read",
  "roles:write",
  "roles:delete",
  "settings:read",
  "settings:write",
  "audit:read",
  "notifications:write",
  "stats:read",
];

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ip: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  rateLimitPerMinute: number;
  maxUploadSizeMb: number;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  recentAuditEntries: AuditEntry[];
}

export interface PaginatedResponse<T> {
  ok: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TableParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}
