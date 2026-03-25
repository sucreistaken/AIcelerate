import { describe, it, expect, vi, beforeEach } from "vitest";
import { asyncHandler } from "../asyncHandler";

describe("asyncHandler", () => {
  const mockReq = {} as any;
  const mockRes = {} as any;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it("calls the handler and does not call next on success", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("calls next with error when handler throws", async () => {
    const error = new Error("test error");
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("calls next with error when async handler rejects with custom error", async () => {
    const error = Object.assign(new Error("custom"), { statusCode: 422 });
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
    expect((mockNext.mock.calls[0][0] as any).statusCode).toBe(422);
  });
});
