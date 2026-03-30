# LearnCraft Admin Panel — Design Specification

**Date:** 2026-03-30
**Status:** Approved
**Scope:** Full admin dashboard integrated into existing React app

---

## 1. Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RBAC model | Flexible roles + permissions | Extensible, `resource:action` format |
| App integration | Same app, `/admin/*` route prefix | Shared components, no monorepo overhead |
| Router strategy | React Router only for admin, existing mode-based routing untouched | Zero risk to existing functionality |
| Initial modules | 9 modules (dashboard, users, courses, lessons, moderation, notifications, ai-stats, audit, settings) | Full coverage from day one |
| UI approach | Extend existing `components/ui/` layer | Consistent design language, no second style system |
| Architecture | Feature-Sliced Admin (Approach A) | Modular, each module self-contained, easy to extend |

---

## 2. RBAC System

### Permission Format

`resource:action` — granular, extensible.

```typescript
type Permission =
  | "users:read" | "users:write" | "users:delete"
  | "courses:read" | "courses:write" | "courses:delete"
  | "lessons:read" | "lessons:write" | "lessons:delete"
  | "content:moderate"
  | "notifications:read" | "notifications:write"
  | "ai-stats:read"
  | "audit:read"
  | "settings:read" | "settings:write"
  | "roles:manage"

type Role = {
  id: string
  name: string
  permissions: Permission[]
  isSystem: boolean
}
```

### Default Roles

| Role | Permissions |
|------|------------|
| `admin` | All (`*`), system role, cannot be deleted |
| `moderator` | `users:read`, `courses:read/write`, `lessons:read/write`, `content:moderate`, `notifications:*`, `audit:read` |
| `viewer` | All `:read` permissions |

### Backend Middleware

- `requirePermission(perm)` — checks `req.user.role` permissions, returns 403 if denied
- Admin role always bypasses permission checks
- Stacks with existing `requireAuth` middleware

### Frontend

- `usePermission(perm): boolean` hook
- `useHasAnyPermission(perms): boolean` hook
- `<PermissionGate permission="...">` wrapper component
- Sidebar items filtered by permission
- Route-level redirect for unauthorized access

### User Model Extension

Add `role: string` field to existing User model (defaults to no role = regular user).

---

## 3. Folder Structure

```
web/src/admin/
├── components/                    # Admin-wide shared components
│   ├── AdminLayout.tsx            # Shell: sidebar + topbar + content
│   ├── AdminSidebar.tsx           # Left navigation
│   ├── AdminTopbar.tsx            # Top bar
│   ├── AdminGuard.tsx             # Auth + permission guard
│   ├── PageContainer.tsx          # Page wrapper
│   ├── PageHeader.tsx             # Title + subtitle + actions
│   ├── DataTable.tsx              # Generic table component
│   ├── FormBuilder.tsx            # Generic form component
│   ├── StatCard.tsx               # Dashboard stat display
│   ├── PermissionGate.tsx         # Permission wrapper
│   ├── EmptyState.tsx             # No data state
│   ├── RowActions.tsx             # Table row action dropdown
│   ├── FilterBar.tsx              # Table filter controls
│   └── AdminNotFound.tsx          # 404 page
│
├── modules/
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── components/
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── StatsGrid.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardStats.ts
│   │   ├── services/
│   │   │   └── dashboardApi.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── users/
│   │   ├── UsersPage.tsx
│   │   ├── UserDetailPage.tsx
│   │   ├── components/
│   │   │   ├── UserAvatar.tsx
│   │   │   └── RoleBadge.tsx
│   │   ├── hooks/
│   │   │   └── useUsers.ts
│   │   ├── services/
│   │   │   └── userAdminApi.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── courses/
│   │   ├── CoursesPage.tsx
│   │   ├── CourseDetailPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── lessons/
│   │   ├── LessonsPage.tsx
│   │   ├── LessonDetailPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── content-moderation/
│   │   ├── ContentModerationPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── notifications/
│   │   ├── NotificationsPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── ai-stats/
│   │   ├── AiStatsPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── audit-log/
│   │   ├── AuditLogPage.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   │
│   └── settings/
│       ├── SettingsPage.tsx
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── index.ts
│
├── hooks/                         # Admin-wide hooks
│   ├── usePermission.ts
│   ├── useTableState.ts
│   ├── useTableData.ts
│   └── useForm.ts
│
├── services/                      # Admin API client
│   └── adminApi.ts
│
├── stores/                        # Admin-specific Zustand stores
│   └── adminAuthStore.ts
│
├── types/                         # Admin-wide types
│   ├── permissions.ts
│   ├── roles.ts
│   └── index.ts
│
├── utils/                         # Admin-specific helpers
│   └── formatters.ts
│
├── styles/                        # Admin-specific styles
│   ├── admin-layout.css
│   ├── admin-sidebar.css
│   ├── admin-table.css
│   └── admin-form.css
│
├── registry.ts                    # Module registry (sidebar + routes source of truth)
├── routes.tsx                     # React Router config
└── AdminApp.tsx                   # Admin entry point
```

### Backend Additions

```
backend/
├── routes/
│   └── adminRoutes.ts             # All /api/admin/* routes
├── controllers/
│   └── adminController.ts         # Admin-specific handlers
├── middleware/
│   ├── requirePermission.ts       # Permission check middleware
│   └── auditLog.ts                # Audit logging middleware
├── services/
│   ├── roleService.ts             # Role CRUD
│   ├── auditService.ts            # Audit log service
│   └── adminStatsService.ts       # Dashboard stats aggregation
├── repositories/
│   ├── roleRepo.ts                # Roles storage
│   └── auditRepo.ts               # Audit log storage
├── models/
│   └── AuditLog.ts                # Mongoose model (if MongoDB)
├── validators/
│   └── adminSchemas.ts            # Zod schemas for admin endpoints
├── types/
│   └── admin.ts                   # Admin-specific types
└── data/
    ├── roles.json                 # Default roles data
    └── audit-log.json             # Audit entries
```

---

## 4. Layout System

### Structure

```
┌─────────────────────────────────────────────┐
│ AdminTopbar (56px fixed)                     │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Content (scrollable)              │
│ (240px)  │                                   │
│ collaps. │  PageContainer                    │
│ to 64px  │    PageHeader                     │
│          │    PageContent                    │
│          │                                   │
│ Groups:  │                                   │
│ Yönetim  │                                   │
│ İçerik   │                                   │
│ Analitik │                                   │
│ Sistem   │                                   │
│          │                                   │
│ ← App    │                                   │
└──────────┴──────────────────────────────────┘
```

- Topbar: hamburger toggle, title, notifications badge, user dropdown
- Sidebar: grouped menu items, permission-filtered, collapsible, "back to app" link
- Content: `<Outlet />` from React Router, scrollable
- Mobile: sidebar becomes overlay

### Page Template

Every admin page follows:

```tsx
<PageContainer>
  <PageHeader title="..." subtitle="..." actions={<Button />} />
  <PageContent>
    {/* Table, form, stats, etc. */}
  </PageContent>
</PageContainer>
```

---

## 5. DataTable Component

### Props

```typescript
interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  pagination: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }
  sorting?: { sortBy: string; sortDir: "asc" | "desc"; onSort: (key: string) => void }
  filters?: Filter[]
  onFilterChange?: (filters: Filter[]) => void
  loading?: boolean
  emptyState?: ReactNode
  onRowClick?: (item: T) => void
  bulkActions?: BulkAction[]
}

interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (item: T) => ReactNode
  width?: string
}
```

### Features

- Generic type `<T>` — works with any data shape
- Server-side pagination, sorting, filtering
- Skeleton loading rows
- Empty state component
- Row action dropdowns
- Checkbox bulk selection + bulk actions
- Responsive: horizontal scroll on mobile

### Helper Hooks

- `useTableState()` — manages page, sort, filter state
- `useTableData(endpoint, params)` — fetches paginated data, returns `{ data, total, isLoading, refetch }`

---

## 6. FormBuilder Component

### Props

```typescript
interface FormBuilderProps<T> {
  schema: ZodSchema<T>
  defaultValues?: Partial<T>
  onSubmit: (data: T) => Promise<void>
  fields: FieldConfig[]
  submitLabel?: string
  layout?: "vertical" | "horizontal" | "two-column"
  loading?: boolean
}

interface FieldConfig {
  name: string
  label: string
  type: "text" | "email" | "password" | "number" | "select" | "multiselect" | "switch" | "textarea" | "date"
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  rows?: number
  disabled?: boolean
}
```

### Features

- Zod validation with field-level error messages
- Dirty tracking — submit disabled when no changes
- Loading state during submission
- Multiple layout modes
- `useForm(schema, defaults)` hook for custom forms

---

## 7. API Integration

### Admin API Client

Wraps existing fetch pattern with admin prefix:

```typescript
// admin/services/adminApi.ts
const adminApi = {
  get:    <T>(path, params?) => fetch(`${API_URL}/api/admin${path}`, ...),
  post:   <T>(path, body) => ...,
  patch:  <T>(path, body) => ...,
  delete: <T>(path) => ...,
}
```

- Reuses `lc_token` from localStorage
- Standard error handling with toast notifications
- Response: `{ ok: true, data, total?, meta? }` or `{ ok: false, error, code }`

### Module Services

Each module wraps adminApi:

```typescript
// modules/users/services/userAdminApi.ts
export const userAdminApi = {
  list:    (params) => adminApi.get<User[]>("/users", params),
  getById: (id) => adminApi.get<User>(`/users/${id}`),
  update:  (id, data) => adminApi.patch<User>(`/users/${id}`, data),
  delete:  (id) => adminApi.delete(`/users/${id}`),
  setRole: (id, role) => adminApi.patch(`/users/${id}/role`, { role }),
}
```

---

## 8. Backend Admin Endpoints

### All under `/api/admin/*` with `requireAuth` + `requirePermission`

```
# Dashboard
GET    /api/admin/stats                         → { totalUsers, totalCourses, totalLessons, activeToday, recentActivity[] }
GET    /api/admin/stats/ai                      → { totalRequests, totalTokens, byModel[], byEndpoint[], daily[] }

# Users
GET    /api/admin/users                         → paginated user list
GET    /api/admin/users/:id                     → user detail
PATCH  /api/admin/users/:id                     → update user
PATCH  /api/admin/users/:id/role                → assign role
DELETE /api/admin/users/:id                     → delete user

# Courses
GET    /api/admin/courses                       → paginated course list
GET    /api/admin/courses/:id                   → course detail with lessons
PATCH  /api/admin/courses/:id                   → update course
DELETE /api/admin/courses/:id                   → delete course

# Lessons
GET    /api/admin/lessons                       → paginated lesson list
GET    /api/admin/lessons/:id                   → lesson detail
DELETE /api/admin/lessons/:id                   → delete lesson

# Content Moderation
GET    /api/admin/content/pending               → pending content list
PATCH  /api/admin/content/:id/approve           → approve
PATCH  /api/admin/content/:id/reject            → reject

# Notifications
GET    /api/admin/notifications                 → notification list
POST   /api/admin/notifications                 → send bulk notification
DELETE /api/admin/notifications/:id             → delete notification

# Audit Log
GET    /api/admin/audit-log                     → paginated, filterable

# Roles
GET    /api/admin/roles                         → list roles
POST   /api/admin/roles                         → create role
PATCH  /api/admin/roles/:id                     → update role
DELETE /api/admin/roles/:id                     → delete role

# Settings
GET    /api/admin/settings                      → system settings
PATCH  /api/admin/settings                      → update settings
```

### Audit Log

Every admin action automatically logged via `auditLog(action)` middleware:

```typescript
type AuditEntry = {
  id: string
  userId: string
  action: string       // "user.delete", "role.assign"
  resource: string     // "user:abc123"
  details: object
  ip: string
  timestamp: string
}
```

---

## 9. Module Registry

Single source of truth for sidebar + routes:

```typescript
type AdminModule = {
  id: string
  label: string
  icon: LucideIcon
  path: string
  permission: Permission
  group: "management" | "content" | "analytics" | "system"
}
```

Adding a new module = 3 steps:
1. Create folder in `admin/modules/`
2. Add entry to registry
3. Add `<Route>` in routes.tsx

---

## 10. Styling

- Extends existing CSS variable system (dark/light themes)
- Admin-specific CSS files in `admin/styles/`
- No new styling framework
- Reuses `components/ui/` atoms (Button, Card, Modal, Input, Badge, Spinner)
- New admin components (DataTable, FormBuilder, StatCard, Sidebar) follow same CSS variable patterns

---

## 11. Integration Plan (Minimal Chaos)

### Files Modified in Existing Codebase

1. `web/src/App.tsx` — add `if (pathname.startsWith("/admin")) return <AdminApp />`
2. `web/package.json` — add `react-router-dom` dependency
3. `backend/routes/index.ts` — mount admin routes: `router.use("/admin", adminRoutes)`
4. `backend/models/User.ts` — add `role: string` field
5. `backend/server.ts` — no changes needed (routes auto-mounted)

### Files NOT Modified

- All existing components, stores, hooks, services — untouched
- Existing mode-based routing — untouched
- Existing CSS/theme system — untouched (extended, not modified)

### New Dependencies

- `react-router-dom` (frontend only)
- `zod` already exists in backend

---

## 12. Adding Future Modules

Example: Adding a "Reports" module.

1. Create `admin/modules/reports/` with standard structure
2. Add to `registry.ts`: `{ id: "reports", label: "Raporlar", icon: FileBarChart, path: "/admin/reports", permission: "reports:read", group: "analytics" }`
3. Add route: `<Route path="reports" element={<ReportsPage />} />`
4. Add permission: `"reports:read"` to Permission type
5. Add backend endpoint if needed

Total: ~5 changes, all additive, nothing breaks.
