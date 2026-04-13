import { describe, it, expect, vi } from "vitest";
import { AppError, AiTimeoutError, notFound, badRequest, forbidden, conflict, unprocessable, gatewayTimeout, errorHandler } from "../errorHandler";

describe("AppError", () => {
  it("creates error with statusCode and message", () => {
    const err = new AppError(400, "Bad input", "BAD_INPUT");
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Bad input");
    expect(err.code).toBe("BAD_INPUT");
    expect(err.name).toBe("AppError");
    expect(err instanceof Error).toBe(true);
  });
});

describe("error factory helpers", () => {
  it("notFound creates 404", () => {
    const err = notFound("Item missing");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("badRequest creates 400", () => {
    const err = badRequest();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
  });

  it("forbidden creates 403", () => {
    const err = forbidden();
    expect(err.statusCode).toBe(403);
  });

  it("conflict creates 409", () => {
    const err = conflict();
    expect(err.statusCode).toBe(409);
  });

  it("unprocessable creates 422", () => {
    const err = unprocessable();
    expect(err.statusCode).toBe(422);
  });

  it("gatewayTimeout creates 504", () => {
    const err = gatewayTimeout();
    expect(err.statusCode).toBe(504);
  });
});

describe("errorHandler middleware", () => {
  const mockReq = {} as any;
  const mockNext = vi.fn();

  function createMockRes() {
    const res: any = { headersSent: false };
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  }

  it("handles AppError with correct status and body", () => {
    const res = createMockRes();
    const err = new AppError(422, "Invalid data", "VALIDATION");

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid data",
      code: "VALIDATION",
    });
  });

  it("handles AI_TIMEOUT error", () => {
    const res = createMockRes();
    const err = new AiTimeoutError();

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "AI_TIMEOUT" })
    );
  });

  it("handles validation errors", () => {
    const res = createMockRes();
    const err = Object.assign(new Error("field required"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: [{ path: "name", message: "required" }],
    });

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "VALIDATION_ERROR" })
    );
  });

  it("handles LLM parse errors", () => {
    const res = createMockRes();
    const err = Object.assign(new Error("parse failed"), { llmText: "raw output" });

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "LLM_PARSE_ERROR", llmText: "raw output" })
    );
  });

  it("handles generic errors as 500", () => {
    const res = createMockRes();
    const err = new Error("unknown");

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INTERNAL_ERROR" })
    );
  });

  it("does nothing if headers already sent", () => {
    const res = createMockRes();
    res.headersSent = true;

    errorHandler(new Error("test"), mockReq, res, mockNext);

    expect(res.status).not.toHaveBeenCalled();
  });
});
