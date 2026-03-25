import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "../validate";

describe("validate middleware", () => {
  const mockRes = {} as any;

  it("passes valid body through and replaces req.body with parsed data", () => {
    const schema = z.object({ name: z.string(), age: z.number().default(0) });
    const middleware = validate(schema);

    const req = { body: { name: "test" } } as any;
    const next = vi.fn();

    middleware(req, mockRes, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "test", age: 0 });
  });

  it("calls next with error on invalid body", () => {
    const schema = z.object({ name: z.string().min(1, "name is required") });
    const middleware = validate(schema);

    const req = { body: {} } as any;
    const next = vi.fn();

    middleware(req, mockRes, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toBeInstanceOf(Array);
  });

  it("provides details array on validation error", () => {
    const schema = z.object({
      a: z.string(),
      b: z.number(),
    });
    const middleware = validate(schema);

    const req = { body: { a: 123, b: "wrong" } } as any;
    const next = vi.fn();

    middleware(req, mockRes, next);

    const err = next.mock.calls[0][0];
    expect(err.details).toBeInstanceOf(Array);
    expect(err.details.length).toBeGreaterThan(0);
    expect(err.details[0]).toHaveProperty("path");
    expect(err.details[0]).toHaveProperty("message");
  });
});
