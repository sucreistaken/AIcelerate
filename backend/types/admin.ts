// types/admin.ts — Admin panel types

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

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const DEFAULT_ROLES: Omit<Role, "id">[] = [
  {
    name: "admin",
    description: "Full access to all admin features",
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "moderator",
    description: "Can manage users and content but not system settings",
    permissions: [
      "users:read",
      "users:write",
      "courses:read",
      "courses:write",
      "lessons:read",
      "lessons:write",
      "roles:read",
      "audit:read",
      "stats:read",
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: "viewer",
    description: "Read-only access to admin panel",
    permissions: [
      "users:read",
      "courses:read",
      "lessons:read",
      "roles:read",
      "audit:read",
      "stats:read",
    ],
    isSystem: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
