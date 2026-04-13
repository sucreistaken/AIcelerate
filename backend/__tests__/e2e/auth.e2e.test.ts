import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAgent, getAuthHeader } from "./setup";
import { User } from "../../models/User";
import { RefreshToken } from "../../models/RefreshToken";

// Cast mocked models for convenience
const MockUser = vi.mocked(User);
const MockRefreshToken = vi.mocked(RefreshToken);

describe("Auth E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/register
  // -----------------------------------------------------------------------
  describe("POST /api/auth/register", () => {
    it("returns 400 for missing fields", async () => {
      const res = await createAgent()
        .post("/api/auth/register")
        .send({ email: "test@example.com" }); // missing password & nickname

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "not-an-email",
          password: "StrongP@ss1",
          nickname: "tester",
        });

      expect(res.status).toBe(400);
    });

    it("returns 400 for weak password (too short)", async () => {
      // Zod schema requires min 8 chars, so this should fail at validation
      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Aa1!",
          nickname: "tester",
        });

      expect(res.status).toBe(400);
    });

    it("returns 400 for weak password (no uppercase)", async () => {
      // Passes Zod (length >= 8), but authService rejects missing uppercase
      MockUser.exists.mockResolvedValue(null as any);

      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "weakpass1!",
          nickname: "tester",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/uppercase/i);
    });

    it("returns 400 for weak password (no digit)", async () => {
      MockUser.exists.mockResolvedValue(null as any);

      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Weakpass!",
          nickname: "tester",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/digit/i);
    });

    it("returns 400 for weak password (no special character)", async () => {
      MockUser.exists.mockResolvedValue(null as any);

      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "Weakpass1",
          nickname: "tester",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/special character/i);
    });

    it("returns 409 when email already registered", async () => {
      MockUser.exists.mockResolvedValue({ _id: "existing-user" } as any);

      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "StrongP@ss1",
          nickname: "tester",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it("returns 201 on successful registration", async () => {
      MockUser.exists.mockResolvedValue(null as any);
      MockUser.create.mockResolvedValue([{
        _id: { toString: () => "new-user-id" },
        email: "new@example.com",
        profile: { nickname: "tester", avatar: "avatar-1" },
        friendCode: "ABCD1234",
        role: "",
      }] as any);
      MockRefreshToken.create.mockResolvedValue({} as any);

      const res = await createAgent()
        .post("/api/auth/register")
        .send({
          email: "new@example.com",
          password: "StrongP@ss1",
          nickname: "tester",
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("new@example.com");
      expect(res.body.token).toBeDefined();
      // refreshToken should NOT be in the body (it is set as HttpOnly cookie)
      expect(res.body.refreshToken).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/login
  // -----------------------------------------------------------------------
  describe("POST /api/auth/login", () => {
    it("returns 400 for missing fields", async () => {
      const res = await createAgent()
        .post("/api/auth/login")
        .send({ email: "test@example.com" }); // missing password

      expect(res.status).toBe(400);
    });

    it("returns 401 for non-existent email", async () => {
      MockUser.findOne.mockResolvedValue(null as any);

      const res = await createAgent()
        .post("/api/auth/login")
        .send({ email: "noone@example.com", password: "AnyP@ss1" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it("returns 401 for wrong password", async () => {
      MockUser.findOne.mockResolvedValue({
        _id: { toString: () => "user-1" },
        email: "test@example.com",
        passwordHash: "$2a$12$invalidhashthatshouldneverwork",
        profile: { nickname: "tester", avatar: "avatar-1" },
        friendCode: "ABCD1234",
      } as any);

      const res = await createAgent()
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "WrongP@ss1" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/auth/logout
  // -----------------------------------------------------------------------
  describe("POST /api/auth/logout", () => {
    it("returns 200 even without refresh token (graceful)", async () => {
      MockRefreshToken.deleteOne.mockResolvedValue({} as any);

      const res = await createAgent().post("/api/auth/logout").send({});

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Protected routes WITHOUT auth — expect 401
  // -----------------------------------------------------------------------
  describe("Protected routes without auth", () => {
    it("GET /api/lessons returns 401 without token", async () => {
      const res = await createAgent().get("/api/lessons");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("GET /api/courses returns 401 without token", async () => {
      const res = await createAgent().get("/api/courses");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("GET /api/dashboard/init returns 401 without token", async () => {
      const res = await createAgent().get("/api/dashboard/init");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("POST /api/flashcards returns 401 without token", async () => {
      const res = await createAgent()
        .post("/api/flashcards")
        .send({ lessonId: "l1", front: "Q", back: "A" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("GET /api/notifications returns 401 without token", async () => {
      const res = await createAgent().get("/api/notifications");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("GET /api/auth/me returns 401 without token", async () => {
      const res = await createAgent().get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("POST /api/auth/logout-all returns 401 without token", async () => {
      const res = await createAgent().post("/api/auth/logout-all");
      expect(res.status).toBe(401);
    });

    it("POST /api/auth/change-password returns 401 without token", async () => {
      const res = await createAgent()
        .post("/api/auth/change-password")
        .send({ currentPassword: "old", newPassword: "NewP@ss1" });
      expect(res.status).toBe(401);
    });

    it("returns 401 for invalid (garbage) token", async () => {
      const res = await createAgent()
        .get("/api/lessons")
        .set("Authorization", "Bearer this.is.garbage");
      expect(res.status).toBe(401);
    });

    it("returns 401 for expired token", async () => {
      const jwt = require("jsonwebtoken");
      const expiredToken = jwt.sign(
        { userId: "u1" },
        process.env.JWT_SECRET,
        { expiresIn: "0s" }
      );
      const res = await createAgent()
        .get("/api/lessons")
        .set("Authorization", `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Protected routes WITH valid auth — expect success (200)
  // -----------------------------------------------------------------------
  describe("Protected routes with valid auth", () => {
    it("GET /api/lessons returns 200 with valid token", async () => {
      const res = await createAgent()
        .get("/api/lessons")
        .set("Authorization", getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.lessons)).toBe(true);
    });

    it("GET /api/courses returns 200 with valid token", async () => {
      const res = await createAgent()
        .get("/api/courses")
        .set("Authorization", getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.courses).toBeDefined();
    });

    it("GET /api/notifications returns 200 with valid token", async () => {
      const res = await createAgent()
        .get("/api/notifications")
        .set("Authorization", getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it("GET /api/flashcards returns 200 with valid token", async () => {
      const res = await createAgent()
        .get("/api/flashcards")
        .set("Authorization", getAuthHeader());

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Public routes — no auth required
  // -----------------------------------------------------------------------
  describe("Public routes", () => {
    it("GET /health returns 200 without auth", async () => {
      const res = await createAgent().get("/health");

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });
});
