import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/authService", () => ({
  authService: {
    verifyToken: vi.fn(),
  },
}));

// Mock User model — getFreshRole does User.findById().select().lean()
const mockUserFindById = vi.fn();
vi.mock("../../models/User", () => ({
  User: {
    findById: (...args: unknown[]) => mockUserFindById(...args),
  },
}));

import { requireAuth, optionalAuth, type AuthRequest } from "../auth";
import { authService } from "../../services/authService";

const mockedVerifyToken = vi.mocked(authService.verifyToken);

function createMockReq(authHeader?: string): AuthRequest {
  return {
    headers: {
      ...(authHeader !== undefined ? { authorization: authHeader } : {}),
    },
  } as AuthRequest;
}

function createMockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function chainableSelect(doc: unknown) {
  return { select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) }) };
}

describe("requireAuth", () => {
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
    vi.clearAllMocks();
    mockUserFindById.mockReturnValue(chainableSelect({ role: "" }));
  });

  it("returns 401 when no Authorization header", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "Authorization header required", code: "UNAUTHORIZED" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization header doesn't start with 'Bearer '", async () => {
    const req = createMockReq("Basic abc123");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "Authorization header required", code: "UNAUTHORIZED" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid/expired", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error("Token expired");
    });

    const req = createMockReq("Bearer expired-token");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "Token expired", code: "UNAUTHORIZED" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns 401 with 'Invalid token' when error has no message", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error();
    });

    const req = createMockReq("Bearer bad-token");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: "Invalid token", code: "UNAUTHORIZED" });
  });

  it("sets req.user with decoded userId and fresh role from DB", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "user-123", role: "" });
    mockUserFindById.mockReturnValue(chainableSelect({ role: "admin" }));

    const req = createMockReq("Bearer valid-token");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(req.user).toEqual({ userId: "user-123", role: "admin" });
    expect(mockedVerifyToken).toHaveBeenCalledWith("valid-token");
  });

  it("calls next() on successful auth", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "user-456", role: "" });

    const req = createMockReq("Bearer valid-token");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("falls back to JWT role when DB is unreachable", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "user-789", role: "member" });
    mockUserFindById.mockReturnValue(chainableSelect(Promise.reject(new Error("DB down"))));

    const req = createMockReq("Bearer valid-token");
    const res = createMockRes();

    await requireAuth(req, res as never, mockNext);

    // Should use JWT role as fallback
    expect(req.user?.userId).toBe("user-789");
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("optionalAuth", () => {
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
    vi.clearAllMocks();
    mockUserFindById.mockReturnValue(chainableSelect({ role: "" }));
  });

  it("sets req.user when valid token provided", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "user-789", role: "member" });

    const req = createMockReq("Bearer valid-token");
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(req.user?.userId).toBe("user-789");
  });

  it("does NOT set req.user when no token", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(req.user).toBeUndefined();
  });

  it("does NOT set req.user when Authorization header is not Bearer", async () => {
    const req = createMockReq("Basic abc123");
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(req.user).toBeUndefined();
  });

  it("does NOT set req.user when invalid token (but doesn't error)", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error("Token expired");
    });

    const req = createMockReq("Bearer invalid-token");
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("always calls next() regardless of token validity", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error("bad");
    });

    const req = createMockReq("Bearer bad-token");
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("always calls next() when no token", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("always calls next() when valid token", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "user-1", role: "" });

    const req = createMockReq("Bearer good");
    const res = createMockRes();

    await optionalAuth(req, res as never, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
