import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for `apiJson` and `ApiError`. We mock global.fetch so we don't touch
 * the network; single-flight refresh queue has its own integration concerns
 * that aren't exercised here (happy-path + error-branching only).
 */

// Mock the auth module *before* importing apiJson so fetchWithAuth's internal
// token/refresh machinery is deterministic.
vi.mock("../fetchWithAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../fetchWithAuth")>();
  return actual; // keep real implementation; we only stub fetch
});

import { apiJson, ApiError } from "../fetchWithAuth";

const originalFetch = globalThis.fetch;

function mockFetch(res: Partial<Response>): void {
  globalThis.fetch = vi.fn(async () => res as Response) as unknown as typeof fetch;
}

describe("apiJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns parsed JSON on 2xx", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, foo: "bar" }),
    });

    const result = await apiJson<{ ok: true; foo: string }>("/api/x");
    expect(result).toEqual({ ok: true, foo: "bar" });
  });

  it("returns synthetic { ok: true } on 204 No Content", async () => {
    mockFetch({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error("should not be called for 204");
      },
    });

    const result = await apiJson("/api/x", { method: "DELETE" });
    expect(result).toEqual({ ok: true });
  });

  it("throws ApiError with parsed body on non-2xx", async () => {
    mockFetch({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ ok: false, error: "Email taken", code: "CONFLICT" }),
    });

    await expect(apiJson("/api/register")).rejects.toThrowError(ApiError);
    try {
      await apiJson("/api/register");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(409);
      expect(apiErr.message).toBe("Email taken");
      expect(apiErr.body).toEqual({ ok: false, error: "Email taken", code: "CONFLICT" });
    }
  });

  it("falls back to statusText when the error body has no error field", async () => {
    mockFetch({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    });

    await expect(apiJson("/api/x")).rejects.toThrow("Internal Server Error");
  });

  it("falls back to HTTP status number when body isn't JSON", async () => {
    mockFetch({
      ok: false,
      status: 502,
      statusText: "",
      json: async () => {
        throw new Error("Unexpected token <");
      },
    });

    await expect(apiJson("/api/x")).rejects.toThrow(/502/);
  });
});
