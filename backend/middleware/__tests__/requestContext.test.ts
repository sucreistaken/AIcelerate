import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utils/idGenerator", () => ({
  uid: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logger: {
    child: vi.fn().mockReturnValue({ info: vi.fn(), error: vi.fn() }),
  },
}));

import { requestContext } from "../requestContext";
import { uid } from "../../utils/idGenerator";
import { logger } from "../../utils/logger";

const mockedUid = vi.mocked(uid);
const mockedLoggerChild = vi.mocked(logger.child);

describe("requestContext", () => {
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it("attaches requestId to request", () => {
    mockedUid.mockReturnValue("req-abc123");

    const req: any = { method: "GET", originalUrl: "/api/test", headers: {} };
    const res: any = {};

    requestContext(req, res, mockNext);

    expect(req.requestId).toBe("req-abc123");
  });

  it("creates child logger with requestId", () => {
    mockedUid.mockReturnValue("req-def456");
    const childLogger = { info: vi.fn(), error: vi.fn() };
    mockedLoggerChild.mockReturnValue(childLogger as any);

    const req: any = { method: "POST", originalUrl: "/api/data", headers: {} };
    const res: any = {};

    requestContext(req, res, mockNext);

    expect(mockedLoggerChild).toHaveBeenCalledWith({
      requestId: "req-def456",
      userId: undefined,
      method: "POST",
      path: "/api/data",
    });
    expect(req.log).toBe(childLogger);
  });

  it("includes userId in child logger when authenticated", () => {
    mockedUid.mockReturnValue("req-ghi789");
    mockedLoggerChild.mockReturnValue({ info: vi.fn() } as any);

    const req: any = {
      method: "GET",
      originalUrl: "/api/me",
      headers: {},
      user: { userId: "user-42" },
    };
    const res: any = {};

    requestContext(req, res, mockNext);

    expect(mockedLoggerChild).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-42" })
    );
  });

  it("always generates fresh requestId (no spoofing)", () => {
    mockedUid.mockReturnValueOnce("fresh-id-1").mockReturnValueOnce("fresh-id-2");

    const req1: any = {
      method: "GET",
      originalUrl: "/a",
      headers: {},
      requestId: "spoofed-id",
    };
    const req2: any = { method: "GET", originalUrl: "/b", headers: {} };
    const res: any = {};

    requestContext(req1, res, mockNext);
    requestContext(req2, res, mockNext);

    expect(req1.requestId).toBe("fresh-id-1");
    expect(req2.requestId).toBe("fresh-id-2");
    expect(req1.requestId).not.toBe("spoofed-id");
  });

  it("calls next()", () => {
    mockedUid.mockReturnValue("id");
    mockedLoggerChild.mockReturnValue({ info: vi.fn() } as any);

    const req: any = { method: "GET", originalUrl: "/", headers: {} };
    const res: any = {};

    requestContext(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockNext).toHaveBeenCalledWith();
  });
});
