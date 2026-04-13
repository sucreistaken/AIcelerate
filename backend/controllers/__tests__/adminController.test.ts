import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Role, AuditEntry, SystemSettings, PaginatedResponse } from "../../types/admin";

// ── Env vars before any module loads ──
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// ── Mock logger ──
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// ── Mock User model ──
const mockCountDocuments = vi.fn();
const mockFind = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindByIdAndDelete = vi.fn();

vi.mock("../../models/User", () => ({
  User: {
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
    find: (...args: unknown[]) => mockFind(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    findByIdAndDelete: (...args: unknown[]) => mockFindByIdAndDelete(...args),
  },
}));

// ── Mock roleRepo ──
const mockRoleFindAll = vi.fn();
const mockRoleFindById = vi.fn();
const mockRoleFindByName = vi.fn();
const mockRoleCreate = vi.fn();
const mockRoleUpdate = vi.fn();
const mockRoleDelete = vi.fn();

vi.mock("../../repositories/roleRepo", () => ({
  roleRepo: {
    findAll: (...args: unknown[]) => mockRoleFindAll(...args),
    findById: (...args: unknown[]) => mockRoleFindById(...args),
    findByName: (...args: unknown[]) => mockRoleFindByName(...args),
    create: (...args: unknown[]) => mockRoleCreate(...args),
    update: (...args: unknown[]) => mockRoleUpdate(...args),
    delete: (...args: unknown[]) => mockRoleDelete(...args),
  },
}));

// ── Mock auditRepo ──
const mockAuditFindPaginated = vi.fn();

vi.mock("../../repositories/auditRepo", () => ({
  auditRepo: {
    findPaginated: (...args: unknown[]) => mockAuditFindPaginated(...args),
  },
}));

// ── Mock settingsRepo ──
const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock("../../repositories/settingsRepo", () => ({
  settingsRepo: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  },
}));

// ── Mock adminService ──
const mockCascadeDeleteUser = vi.fn();

vi.mock("../../services/adminService", () => ({
  cascadeDeleteUser: (...args: unknown[]) => mockCascadeDeleteUser(...args),
}));

// ── Mock idGenerator ──
vi.mock("../../utils/idGenerator", () => ({
  generateId: (prefix?: string) => (prefix ? `${prefix}-mock-uuid` : "mock-uuid"),
}));

// ── Mock courseRepo (dynamic import) ──
const mockCourseRepoCount = vi.fn();
const mockCourseRepoFindAll = vi.fn();
const mockCourseRepoDelete = vi.fn();

vi.mock("../../repositories/courseRepo", () => ({
  courseRepo: {
    count: (...args: unknown[]) => mockCourseRepoCount(...args),
    findAll: (...args: unknown[]) => mockCourseRepoFindAll(...args),
    delete: (...args: unknown[]) => mockCourseRepoDelete(...args),
  },
}));

// ── Mock lessonRepo (dynamic import) ──
const mockLessonRepoCount = vi.fn();
const mockLessonRepoFindAll = vi.fn();
const mockLessonRepoDelete = vi.fn();

vi.mock("../../repositories/lessonRepo", () => ({
  lessonRepo: {
    count: (...args: unknown[]) => mockLessonRepoCount(...args),
    findAll: (...args: unknown[]) => mockLessonRepoFindAll(...args),
    delete: (...args: unknown[]) => mockLessonRepoDelete(...args),
  },
}));

// ── Mock notificationController (dynamic import) ──
const mockCreateNotification = vi.fn();

vi.mock("../notificationController", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

// ── Import after all mocks ──
import {
  getStats,
  listUsers,
  getUser,
  updateUser,
  setUserRole,
  deleteUser,
  listCourses,
  deleteCourse,
  listLessons,
  deleteLesson,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  getAuditLog,
  getSettings,
  updateSettings,
  sendNotification,
} from "../adminController";

// ── Helpers ──

function makeFakeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: "user-1",
    email: "test@example.com",
    role: "member",
    profile: { nickname: "TestUser", avatar: "avatar-1" },
    settings: { theme: "dark", notifications: true, sound: true },
    friendIds: [],
    friendRequests: [],
    roomIds: [],
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeFakeRole(overrides: Partial<Role> = {}): Role {
  return {
    id: "role-1",
    name: "editor",
    description: "Can edit things",
    permissions: ["courses:read", "courses:write"],
    isSystem: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFakeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: "audit-1",
    userId: "user-1",
    action: "user.login",
    resource: "auth",
    ip: "127.0.0.1",
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFakeSettings(overrides: Partial<SystemSettings> = {}): SystemSettings {
  return {
    id: "system-settings",
    rateLimitPerMinute: 200,
    maxUploadSizeMb: 10,
    maintenanceMode: false,
    allowRegistration: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Tests ──

beforeEach(() => {
  vi.clearAllMocks();
});

// ────────────────────────── getStats ──────────────────────────

describe("getStats", () => {
  it("should return all stats when every source succeeds", async () => {
    const auditEntries = [makeFakeAuditEntry()];
    mockCountDocuments.mockResolvedValue(42);
    mockCourseRepoCount.mockResolvedValue(10);
    mockLessonRepoCount.mockResolvedValue(100);
    mockAuditFindPaginated.mockResolvedValue({
      items: auditEntries,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const result = await getStats();

    expect(result).toEqual({
      totalUsers: 42,
      totalCourses: 10,
      totalLessons: 100,
      recentAuditEntries: auditEntries,
    });
    expect(mockCountDocuments).toHaveBeenCalledOnce();
    expect(mockCourseRepoCount).toHaveBeenCalledOnce();
    expect(mockLessonRepoCount).toHaveBeenCalledOnce();
    expect(mockAuditFindPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      sortDir: "desc",
    });
  });

  it("should return 0 for users when User.countDocuments fails (graceful degradation)", async () => {
    mockCountDocuments.mockRejectedValue(new Error("MongoDB down"));
    mockCourseRepoCount.mockResolvedValue(5);
    mockLessonRepoCount.mockResolvedValue(50);
    mockAuditFindPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await getStats();

    expect(result.totalUsers).toBe(0);
    expect(result.totalCourses).toBe(5);
    expect(result.totalLessons).toBe(50);
  });

  it("should return 0 for courses when courseRepo fails (graceful degradation)", async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockCourseRepoCount.mockRejectedValue(new Error("Course repo unavailable"));
    mockLessonRepoCount.mockResolvedValue(50);
    mockAuditFindPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await getStats();

    expect(result.totalUsers).toBe(10);
    expect(result.totalCourses).toBe(0);
    expect(result.totalLessons).toBe(50);
  });

  it("should return 0 for lessons when lessonRepo fails (graceful degradation)", async () => {
    mockCountDocuments.mockResolvedValue(10);
    mockCourseRepoCount.mockResolvedValue(5);
    mockLessonRepoCount.mockRejectedValue(new Error("Lesson repo unavailable"));
    mockAuditFindPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await getStats();

    expect(result.totalUsers).toBe(10);
    expect(result.totalCourses).toBe(5);
    expect(result.totalLessons).toBe(0);
  });

  it("should return 0 for all counts when every source fails except audit", async () => {
    mockCountDocuments.mockRejectedValue(new Error("fail"));
    mockCourseRepoCount.mockRejectedValue(new Error("fail"));
    mockLessonRepoCount.mockRejectedValue(new Error("fail"));
    mockAuditFindPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    const result = await getStats();

    expect(result).toEqual({
      totalUsers: 0,
      totalCourses: 0,
      totalLessons: 0,
      recentAuditEntries: [],
    });
  });
});

// ────────────────────────── listUsers ──────────────────────────

describe("listUsers", () => {
  it("should return paginated users with defaults", async () => {
    const users = [makeFakeUser(), makeFakeUser({ _id: "user-2", email: "b@b.com" })];
    mockCountDocuments.mockResolvedValue(2);

    // Chainable query: .select().sort().skip().limit()
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(users),
    };
    mockFind.mockReturnValue(queryChain);

    const result = await listUsers({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: users,
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    expect(queryChain.select).toHaveBeenCalledWith("-passwordHash");
    expect(queryChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(queryChain.skip).toHaveBeenCalledWith(0);
    expect(queryChain.limit).toHaveBeenCalledWith(20);
  });

  it("should apply search filter on email and nickname", async () => {
    mockCountDocuments.mockResolvedValue(1);
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([makeFakeUser()]),
    };
    mockFind.mockReturnValue(queryChain);

    await listUsers({ page: 1, limit: 10, search: "test" });

    // Verify that countDocuments was called with a filter containing $or
    const filterArg = mockCountDocuments.mock.calls[0][0] as Record<string, unknown>;
    expect(filterArg).toHaveProperty("$or");
    const orFilters = filterArg.$or as Array<Record<string, unknown>>;
    expect(orFilters).toHaveLength(2);
  });

  it("should escape regex special characters in search", async () => {
    mockCountDocuments.mockResolvedValue(0);
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockFind.mockReturnValue(queryChain);

    await listUsers({ page: 1, limit: 10, search: "test+user" });

    const filterArg = mockCountDocuments.mock.calls[0][0] as Record<string, unknown>;
    const orFilters = filterArg.$or as Array<Record<string, { $regex: string }>>;
    // The '+' should be escaped to '\\+'
    expect(orFilters[0].email.$regex).toContain("\\+");
  });

  it("should handle pagination with page > 1", async () => {
    mockCountDocuments.mockResolvedValue(50);
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockFind.mockReturnValue(queryChain);

    const result = await listUsers({ page: 3, limit: 10 });

    expect(result.totalPages).toBe(5);
    expect(queryChain.skip).toHaveBeenCalledWith(20); // (3 - 1) * 10
    expect(queryChain.limit).toHaveBeenCalledWith(10);
  });

  it("should sort ascending when sortDir is asc", async () => {
    mockCountDocuments.mockResolvedValue(1);
    const queryChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockFind.mockReturnValue(queryChain);

    await listUsers({ page: 1, limit: 10, sortBy: "email", sortDir: "asc" });

    expect(queryChain.sort).toHaveBeenCalledWith({ email: 1 });
  });
});

// ────────────────────────── getUser ──────────────────────────

describe("getUser", () => {
  it("should return a user by id without passwordHash", async () => {
    const user = makeFakeUser();
    mockFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue(user),
    });

    const result = await getUser("user-1");

    expect(result).toEqual(user);
    expect(mockFindById).toHaveBeenCalledWith("user-1");
  });

  it("should throw notFound when user does not exist", async () => {
    mockFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(getUser("nonexistent")).rejects.toThrow("User not found");
  });
});

// ────────────────────────── updateUser ──────────────────────────

describe("updateUser", () => {
  it("should update user and strip passwordHash/password fields", async () => {
    const updated = makeFakeUser({ role: "admin" });
    mockFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(updated),
    });

    const result = await updateUser("user-1", {
      role: "admin",
      passwordHash: "sneaky",
      password: "alsosneaky",
    });

    expect(result).toEqual(updated);
    // Verify that passwordHash and password were stripped from updates
    const updateArg = mockFindByIdAndUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty("passwordHash");
    expect(updateArg).not.toHaveProperty("password");
    expect(updateArg).toHaveProperty("role", "admin");
  });

  it("should throw notFound when user does not exist", async () => {
    mockFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(updateUser("nonexistent", { role: "admin" })).rejects.toThrow("User not found");
  });
});

// ────────────────────────── setUserRole ──────────────────────────

describe("setUserRole", () => {
  it("should set role when role exists", async () => {
    const role = makeFakeRole({ name: "moderator" });
    mockRoleFindByName.mockResolvedValue(role);
    const updatedUser = makeFakeUser({ role: "moderator" });
    mockFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(updatedUser),
    });

    const result = await setUserRole("user-1", "moderator");

    expect(result).toEqual(updatedUser);
    expect(mockRoleFindByName).toHaveBeenCalledWith("moderator");
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "user-1",
      { role: "moderator" },
      { new: true },
    );
  });

  it("should throw badRequest when role does not exist", async () => {
    mockRoleFindByName.mockResolvedValue(null);

    await expect(setUserRole("user-1", "nonexistent")).rejects.toThrow(
      'Role "nonexistent" does not exist',
    );
  });

  it("should throw notFound when user does not exist", async () => {
    mockRoleFindByName.mockResolvedValue(makeFakeRole());
    mockFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    await expect(setUserRole("nonexistent", "editor")).rejects.toThrow("User not found");
  });
});

// ────────────────────────── deleteUser ──────────────────────────

describe("deleteUser", () => {
  it("should cascade delete user and return { deleted: true }", async () => {
    mockFindById.mockResolvedValue(makeFakeUser());
    mockCascadeDeleteUser.mockResolvedValue(undefined);

    const result = await deleteUser("user-1");

    expect(result).toEqual({ deleted: true });
    expect(mockFindById).toHaveBeenCalledWith("user-1");
    expect(mockCascadeDeleteUser).toHaveBeenCalledWith("user-1");
  });

  it("should throw notFound when user does not exist", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(deleteUser("nonexistent")).rejects.toThrow("User not found");
    expect(mockCascadeDeleteUser).not.toHaveBeenCalled();
  });
});

// ────────────────────────── listCourses ──────────────────────────

describe("listCourses", () => {
  it("should return paginated courses", async () => {
    const courses = [
      { id: "c-1", name: "Math 101", code: "MTH101", createdAt: "2026-01-01" },
      { id: "c-2", name: "Physics 101", code: "PHY101", createdAt: "2026-01-02" },
    ];
    mockCourseRepoFindAll.mockResolvedValue(courses);

    const result = await listCourses({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
  });

  it("should filter courses by search term", async () => {
    const courses = [
      { id: "c-1", name: "Math 101", code: "MTH101", createdAt: "2026-01-01" },
      { id: "c-2", name: "Physics 101", code: "PHY101", createdAt: "2026-01-02" },
    ];
    mockCourseRepoFindAll.mockResolvedValue(courses);

    const result = await listCourses({ page: 1, limit: 20, search: "math" });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("should paginate correctly when items exceed page size", async () => {
    const courses = Array.from({ length: 25 }, (_, i) => ({
      id: `c-${i}`,
      name: `Course ${i}`,
      code: `C${i}`,
      createdAt: "2026-01-01",
    }));
    mockCourseRepoFindAll.mockResolvedValue(courses);

    const result = await listCourses({ page: 2, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });
});

// ────────────────────────── deleteCourse ──────────────────────────

describe("deleteCourse", () => {
  it("should delete course and return { deleted: true }", async () => {
    mockCourseRepoDelete.mockResolvedValue(true);

    const result = await deleteCourse("c-1");

    expect(result).toEqual({ deleted: true });
    expect(mockCourseRepoDelete).toHaveBeenCalledWith("c-1");
  });

  it("should throw notFound when course does not exist", async () => {
    mockCourseRepoDelete.mockResolvedValue(false);

    await expect(deleteCourse("nonexistent")).rejects.toThrow("Course not found");
  });
});

// ────────────────────────── listLessons ──────────────────────────

describe("listLessons", () => {
  it("should return paginated lessons", async () => {
    const lessons = [
      { id: "l-1", title: "Intro", createdAt: "2026-01-01" },
      { id: "l-2", title: "Chapter 1", createdAt: "2026-01-02" },
    ];
    mockLessonRepoFindAll.mockResolvedValue(lessons);

    const result = await listLessons({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("should filter lessons by search on title and id", async () => {
    const lessons = [
      { id: "l-1", title: "Intro to Math", createdAt: "2026-01-01" },
      { id: "l-2", title: "Physics Basics", createdAt: "2026-01-02" },
    ];
    mockLessonRepoFindAll.mockResolvedValue(lessons);

    const result = await listLessons({ page: 1, limit: 20, search: "intro" });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ────────────────────────── deleteLesson ──────────────────────────

describe("deleteLesson", () => {
  it("should delete lesson and return { deleted: true }", async () => {
    mockLessonRepoDelete.mockResolvedValue(true);

    const result = await deleteLesson("l-1");

    expect(result).toEqual({ deleted: true });
  });

  it("should throw notFound when lesson does not exist", async () => {
    mockLessonRepoDelete.mockResolvedValue(false);

    await expect(deleteLesson("nonexistent")).rejects.toThrow("Lesson not found");
  });
});

// ────────────────────────── listRoles ──────────────────────────

describe("listRoles", () => {
  it("should return all roles", async () => {
    const roles = [makeFakeRole(), makeFakeRole({ id: "role-2", name: "admin" })];
    mockRoleFindAll.mockResolvedValue(roles);

    const result = await listRoles();

    expect(result).toEqual(roles);
    expect(mockRoleFindAll).toHaveBeenCalledOnce();
  });
});

// ────────────────────────── createRole ──────────────────────────

describe("createRole", () => {
  it("should create a new role when name is unique", async () => {
    mockRoleFindByName.mockResolvedValue(null);
    const createdRole = makeFakeRole({ id: "role-mock-uuid", name: "editor" });
    mockRoleCreate.mockResolvedValue(createdRole);

    const result = await createRole({
      name: "editor",
      description: "Can edit things",
      permissions: ["courses:read", "courses:write"],
    });

    expect(result).toEqual(createdRole);
    expect(mockRoleFindByName).toHaveBeenCalledWith("editor");

    // Verify the shape passed to create
    const createArg = mockRoleCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(createArg.id).toBe("role-mock-uuid");
    expect(createArg.name).toBe("editor");
    expect(createArg.isSystem).toBe(false);
    expect(createArg.permissions).toEqual(["courses:read", "courses:write"]);
  });

  it("should throw conflict when role name already exists", async () => {
    mockRoleFindByName.mockResolvedValue(makeFakeRole({ name: "editor" }));

    await expect(
      createRole({ name: "editor" }),
    ).rejects.toThrow('Role "editor" already exists');
    expect(mockRoleCreate).not.toHaveBeenCalled();
  });

  it("should default description and permissions when not provided", async () => {
    mockRoleFindByName.mockResolvedValue(null);
    mockRoleCreate.mockImplementation((role: unknown) => Promise.resolve(role));

    const result = await createRole({ name: "basic" });

    const created = result as Record<string, unknown>;
    expect(created.description).toBe("");
    expect(created.permissions).toEqual([]);
  });
});

// ────────────────────────── updateRole ──────────────────────────

describe("updateRole", () => {
  it("should update a non-system role", async () => {
    const existing = makeFakeRole({ isSystem: false });
    mockRoleFindById.mockResolvedValue(existing);
    const updated = { ...existing, name: "senior-editor" };
    mockRoleUpdate.mockResolvedValue(updated);

    const result = await updateRole("role-1", { name: "senior-editor" });

    expect(result).toEqual(updated);
    expect(mockRoleUpdate).toHaveBeenCalledWith(
      "role-1",
      expect.objectContaining({ name: "senior-editor" }),
    );
  });

  it("should throw notFound when role does not exist", async () => {
    mockRoleFindById.mockResolvedValue(null);

    await expect(updateRole("nonexistent", { name: "x" })).rejects.toThrow("Role not found");
  });

  it("should throw forbidden when trying to rename a system role", async () => {
    const systemRole = makeFakeRole({ name: "admin", isSystem: true });
    mockRoleFindById.mockResolvedValue(systemRole);

    await expect(
      updateRole("role-1", { name: "superadmin" }),
    ).rejects.toThrow("System roles cannot be renamed");
  });

  it("should allow updating permissions on a system role", async () => {
    const systemRole = makeFakeRole({ name: "admin", isSystem: true });
    mockRoleFindById.mockResolvedValue(systemRole);
    mockRoleUpdate.mockResolvedValue({ ...systemRole, permissions: ["users:read"] });

    // Updating permissions (not name) on system role should work
    const result = await updateRole("role-1", { permissions: ["users:read"] });

    expect(mockRoleUpdate).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it("should allow setting same name on a system role (no actual rename)", async () => {
    const systemRole = makeFakeRole({ name: "admin", isSystem: true });
    mockRoleFindById.mockResolvedValue(systemRole);
    mockRoleUpdate.mockResolvedValue(systemRole);

    // Same name = not a rename, should be allowed
    const result = await updateRole("role-1", { name: "admin" });

    expect(mockRoleUpdate).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

// ────────────────────────── deleteRole ──────────────────────────

describe("deleteRole", () => {
  it("should delete a non-system role and return { deleted: true }", async () => {
    const role = makeFakeRole({ isSystem: false });
    mockRoleFindById.mockResolvedValue(role);
    mockRoleDelete.mockResolvedValue(true);

    const result = await deleteRole("role-1");

    expect(result).toEqual({ deleted: true });
    expect(mockRoleDelete).toHaveBeenCalledWith("role-1");
  });

  it("should throw notFound when role does not exist", async () => {
    mockRoleFindById.mockResolvedValue(null);

    await expect(deleteRole("nonexistent")).rejects.toThrow("Role not found");
    expect(mockRoleDelete).not.toHaveBeenCalled();
  });

  it("should throw forbidden when trying to delete a system role", async () => {
    const systemRole = makeFakeRole({ isSystem: true, name: "admin" });
    mockRoleFindById.mockResolvedValue(systemRole);

    await expect(deleteRole("role-1")).rejects.toThrow("System roles cannot be deleted");
    expect(mockRoleDelete).not.toHaveBeenCalled();
  });

  it("should throw notFound if repo.delete returns false (concurrent deletion)", async () => {
    const role = makeFakeRole({ isSystem: false });
    mockRoleFindById.mockResolvedValue(role);
    mockRoleDelete.mockResolvedValue(false);

    await expect(deleteRole("role-1")).rejects.toThrow("Role not found");
  });
});

// ────────────────────────── getAuditLog ──────────────────────────

describe("getAuditLog", () => {
  it("should return paginated audit log entries", async () => {
    const paginatedResult: PaginatedResponse<AuditEntry> = {
      items: [makeFakeAuditEntry(), makeFakeAuditEntry({ id: "audit-2" })],
      total: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    mockAuditFindPaginated.mockResolvedValue(paginatedResult);

    const result = await getAuditLog({ page: 1, limit: 20 });

    expect(result).toEqual(paginatedResult);
    expect(mockAuditFindPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("should pass all filter params through to auditRepo", async () => {
    mockAuditFindPaginated.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });

    await getAuditLog({
      page: 1,
      limit: 10,
      userId: "user-1",
      action: "user.login",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      search: "login",
      sortBy: "timestamp",
      sortDir: "asc",
    });

    expect(mockAuditFindPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      userId: "user-1",
      action: "user.login",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      search: "login",
      sortBy: "timestamp",
      sortDir: "asc",
    });
  });
});

// ────────────────────────── getSettings ──────────────────────────

describe("getSettings", () => {
  it("should return system settings", async () => {
    const settings = makeFakeSettings();
    mockGetSettings.mockResolvedValue(settings);

    const result = await getSettings();

    expect(result).toEqual(settings);
    expect(mockGetSettings).toHaveBeenCalledOnce();
  });
});

// ────────────────────────── updateSettings ──────────────────────────

describe("updateSettings", () => {
  it("should update and return merged settings", async () => {
    const updated = makeFakeSettings({ maintenanceMode: true });
    mockUpdateSettings.mockResolvedValue(updated);

    const result = await updateSettings({ maintenanceMode: true });

    expect(result).toEqual(updated);
    expect(mockUpdateSettings).toHaveBeenCalledWith({ maintenanceMode: true });
  });

  it("should accept partial updates", async () => {
    const updated = makeFakeSettings({ rateLimitPerMinute: 500 });
    mockUpdateSettings.mockResolvedValue(updated);

    const result = await updateSettings({ rateLimitPerMinute: 500 });

    expect(result.rateLimitPerMinute).toBe(500);
  });
});

// ────────────────────────── sendNotification ──────────────────────────

describe("sendNotification", () => {
  it("should send notification to each target user", async () => {
    mockCreateNotification.mockResolvedValue({ id: "notif-1", dismissed: false });

    const result = await sendNotification({
      title: "Maintenance",
      message: "System going down",
      severity: "warning",
      type: "schedule-reminder",
      targetUserIds: ["user-1", "user-2"],
    });

    expect(result).toHaveLength(2);
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateNotification).toHaveBeenCalledWith("user-1", {
      type: "schedule-reminder",
      title: "Maintenance",
      message: "System going down",
      severity: "warning",
    });
    expect(mockCreateNotification).toHaveBeenCalledWith("user-2", {
      type: "schedule-reminder",
      title: "Maintenance",
      message: "System going down",
      severity: "warning",
    });
  });

  it("should default severity to info and type to schedule-reminder", async () => {
    mockCreateNotification.mockResolvedValue({ id: "notif-1" });

    await sendNotification({
      title: "Test",
      message: "Hello",
      targetUserIds: ["user-1"],
    });

    expect(mockCreateNotification).toHaveBeenCalledWith("user-1", {
      type: "schedule-reminder",
      title: "Test",
      message: "Hello",
      severity: "info",
    });
  });

  it("should return empty array when no target user ids provided", async () => {
    const result = await sendNotification({
      title: "Broadcast",
      message: "No targets",
    });

    expect(result).toEqual([]);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("should throw badRequest when notification system fails", async () => {
    mockCreateNotification.mockRejectedValue(new Error("notification system crashed"));

    await expect(
      sendNotification({
        title: "Fail",
        message: "Oops",
        targetUserIds: ["user-1"],
      }),
    ).rejects.toThrow("Notification system is not available");
  });
});
