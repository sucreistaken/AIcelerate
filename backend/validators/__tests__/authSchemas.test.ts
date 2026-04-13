import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "../authSchemas";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
      nickname: "Jo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects email without @ symbol", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "securepass",
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("rejects email longer than 255 chars", () => {
    const result = registerSchema.safeParse({
      email: "a".repeat(250) + "@b.com",
      password: "securepass",
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "short",
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password exactly 8 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "12345678",
      nickname: "Nick",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password longer than 128 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(129),
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("accepts password exactly 128 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "a".repeat(128),
      nickname: "Nick",
    });
    expect(result.success).toBe(true);
  });

  it("rejects nickname shorter than 2 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
      nickname: "A",
    });
    expect(result.success).toBe(false);
  });

  it("accepts nickname exactly 2 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
      nickname: "AB",
    });
    expect(result.success).toBe(true);
  });

  it("rejects nickname longer than 32 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
      nickname: "A".repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it("accepts nickname exactly 32 chars", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
      nickname: "A".repeat(32),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = registerSchema.safeParse({
      password: "securepass",
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      nickname: "Nick",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing nickname", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "securepass",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({ password: "mypassword" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts valid data", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass1",
      newPassword: "newPass12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short new password (< 8)", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass1",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password longer than 128 chars", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "oldPass1",
      newPassword: "x".repeat(129),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty currentPassword", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newPass12",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(changePasswordSchema.safeParse({}).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "x" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ newPassword: "newPass12" }).success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("accepts valid data", () => {
    const result = deleteAccountSchema.safeParse({ password: "mypassword" });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = deleteAccountSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = deleteAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
