import { describe, it, expect } from "vitest";
import {
  paginationSchema,
  updateUserRoleSchema,
  updateUserSchema,
  createRoleSchema,
  updateRoleSchema,
  updateSettingsSchema,
  sendNotificationSchema,
  auditLogQuerySchema,
} from "../adminSchemas";

describe("paginationSchema", () => {
  it("accepts empty object and applies defaults", () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortDir).toBe("desc");
    }
  });

  it("accepts valid pagination values", () => {
    const result = paginationSchema.safeParse({
      page: 3,
      limit: 50,
      sortBy: "email",
      sortDir: "asc",
      search: "test",
    });
    expect(result.success).toBe(true);
  });

  it("coerces string numbers for page and limit", () => {
    const result = paginationSchema.safeParse({ page: "2", limit: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it("sortBy only accepts whitelisted values", () => {
    const allowed = ["createdAt", "updatedAt", "email", "status", "role"];
    for (const val of allowed) {
      expect(paginationSchema.safeParse({ sortBy: val }).success).toBe(true);
    }
    expect(paginationSchema.safeParse({ sortBy: "name" }).success).toBe(false);
    expect(paginationSchema.safeParse({ sortBy: "id" }).success).toBe(false);
  });

  it("rejects invalid sortDir", () => {
    expect(paginationSchema.safeParse({ sortDir: "up" }).success).toBe(false);
    expect(paginationSchema.safeParse({ sortDir: "down" }).success).toBe(false);
  });

  it("rejects search longer than 100 chars", () => {
    const result = paginationSchema.safeParse({ search: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("accepts search exactly 100 chars", () => {
    const result = paginationSchema.safeParse({ search: "a".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("rejects page less than 1", () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("rejects non-integer page", () => {
    expect(paginationSchema.safeParse({ page: 1.5 }).success).toBe(false);
  });
});

describe("updateUserRoleSchema", () => {
  it("accepts valid role", () => {
    const result = updateUserRoleSchema.safeParse({ role: "admin" });
    expect(result.success).toBe(true);
  });

  it("rejects empty role", () => {
    const result = updateUserRoleSchema.safeParse({ role: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing role", () => {
    const result = updateUserRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateUserSchema", () => {
  it("accepts valid partial update", () => {
    const result = updateUserSchema.safeParse({
      email: "new@example.com",
      status: "online",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid profile sub-object", () => {
    const result = updateUserSchema.safeParse({
      profile: { nickname: "NewNick", bio: "Hello" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid settings sub-object", () => {
    const result = updateUserSchema.safeParse({
      settings: { theme: "dark", notifications: true, sound: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid theme value in settings", () => {
    const result = updateUserSchema.safeParse({
      settings: { theme: "blue" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid status enum values", () => {
    for (const s of ["online", "idle", "dnd", "offline"]) {
      expect(updateUserSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    expect(updateUserSchema.safeParse({ status: "away" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ status: "busy" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = updateUserSchema.safeParse({ email: "not-email" });
    expect(result.success).toBe(false);
  });
});

describe("createRoleSchema", () => {
  it("accepts valid role with defaults", () => {
    const result = createRoleSchema.safeParse({ name: "moderator" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
      expect(result.data.permissions).toEqual([]);
    }
  });

  it("accepts role with all fields", () => {
    const result = createRoleSchema.safeParse({
      name: "admin",
      description: "Admin role",
      permissions: ["read", "write", "delete"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createRoleSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createRoleSchema.safeParse({ description: "No name" });
    expect(result.success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("accepts partial update", () => {
    const result = updateRoleSchema.safeParse({ name: "newname" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateRoleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty name string", () => {
    const result = updateRoleSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts permissions update", () => {
    const result = updateRoleSchema.safeParse({ permissions: ["manage-users"] });
    expect(result.success).toBe(true);
  });
});

describe("updateSettingsSchema", () => {
  it("accepts valid settings", () => {
    const result = updateSettingsSchema.safeParse({
      rateLimitPerMinute: 60,
      maxUploadSizeMb: 10,
      maintenanceMode: false,
      allowRegistration: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects rateLimitPerMinute less than 1", () => {
    const result = updateSettingsSchema.safeParse({ rateLimitPerMinute: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer rateLimitPerMinute", () => {
    const result = updateSettingsSchema.safeParse({ rateLimitPerMinute: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects maxUploadSizeMb less than 1", () => {
    const result = updateSettingsSchema.safeParse({ maxUploadSizeMb: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean maintenanceMode", () => {
    const result = updateSettingsSchema.safeParse({ maintenanceMode: "yes" });
    expect(result.success).toBe(false);
  });
});

describe("sendNotificationSchema", () => {
  it("accepts valid notification with defaults", () => {
    const result = sendNotificationSchema.safeParse({
      title: "Alert",
      message: "Something happened",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe("info");
      expect(result.data.type).toBe("schedule-reminder");
    }
  });

  it("accepts all severity values", () => {
    for (const sev of ["info", "warning", "critical"]) {
      expect(
        sendNotificationSchema.safeParse({
          title: "T",
          message: "M",
          severity: sev,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects invalid severity", () => {
    const result = sendNotificationSchema.safeParse({
      title: "T",
      message: "M",
      severity: "error",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = sendNotificationSchema.safeParse({
      title: "",
      message: "M",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = sendNotificationSchema.safeParse({
      title: "T",
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = sendNotificationSchema.safeParse({ message: "M" });
    expect(result.success).toBe(false);
  });

  it("accepts optional targetUserIds", () => {
    const result = sendNotificationSchema.safeParse({
      title: "T",
      message: "M",
      targetUserIds: ["user1", "user2"],
    });
    expect(result.success).toBe(true);
  });
});

describe("auditLogQuerySchema", () => {
  it("accepts empty object with defaults", () => {
    const result = auditLogQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe("timestamp");
      expect(result.data.sortDir).toBe("desc");
    }
  });

  it("accepts full query", () => {
    const result = auditLogQuerySchema.safeParse({
      page: 2,
      limit: 50,
      sortBy: "action",
      sortDir: "asc",
      search: "login",
      userId: "u123",
      action: "delete",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("sortBy only accepts whitelisted values", () => {
    for (const val of ["timestamp", "action", "userId"]) {
      expect(auditLogQuerySchema.safeParse({ sortBy: val }).success).toBe(true);
    }
    expect(auditLogQuerySchema.safeParse({ sortBy: "email" }).success).toBe(false);
  });

  it("rejects search longer than 100 chars", () => {
    const result = auditLogQuerySchema.safeParse({ search: "x".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects limit over 100", () => {
    const result = auditLogQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});
