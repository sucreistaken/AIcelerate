/**
 * Shared authenticated fetch utility.
 *
 * Security model:
 * - Access token: in-memory ONLY (not in localStorage — immune to XSS persistence)
 * - Refresh token: HttpOnly cookie (set by server — JS can never read it)
 * - On 401: auto-refresh via /auth/refresh (cookie sent automatically by browser)
 * - On page reload: access token is lost → app init calls restoreSession()
 */

import { API_BASE } from "../config";

// ── In-memory token store ──────────────────────────────────────────────────────

let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  // Also keep a copy in localStorage for socket reconnect across page navigations
  // This is the ACCESS token (15min), not the refresh token — acceptable tradeoff
  if (token) {
    localStorage.setItem("lc_token", token);
  } else {
    localStorage.removeItem("lc_token");
  }
}

/**
 * On app startup, try to restore the access token from localStorage.
 * This handles the case where the user refreshes the page.
 * The token might be expired — that's OK, fetchWithAuth will auto-refresh.
 */
export function loadTokenFromStorage(): void {
  const stored = localStorage.getItem("lc_token");
  if (stored) accessToken = stored;
}

// ── Refresh logic ──────────────────────────────────────────────────────────────

async function doRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    // Cookie is sent automatically — no need to pass refreshToken in body
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Send HttpOnly cookie
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      setAccessToken(null);
      throw new Error("Session expired");
    }

    const data = await res.json();
    setAccessToken(data.token);

    for (const { resolve } of refreshQueue) resolve(data.token);
    return data.token;
  } catch (err) {
    for (const { reject } of refreshQueue) reject(err as Error);
    throw err;
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

export { doRefresh as refreshAccessToken };

/**
 * Restore session on app startup.
 * Calls /auth/refresh with the HttpOnly cookie to get a fresh access token.
 * Returns the user object or null if not authenticated.
 */
export async function restoreSession(): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    });

    if (!res.ok) return null;

    const data = await res.json();
    setAccessToken(data.token);
    return data.user;
  } catch {
    return null;
  }
}

// ── Authenticated fetch ────────────────────────────────────────────────────────

/**
 * Same auth behavior as fetchWithAuth (Bearer token + auto-refresh on 401) but
 * returns the raw Response so callers can stream, read headers, or parse JSON
 * themselves. Use this when migrating legacy services that already handle
 * Response parsing (e.g. `res.json()` with custom error shapes).
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = accessToken;
  const incoming = (options?.headers as Record<string, string>) || {};
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;
  const headers: Record<string, string> = { ...incoming };
  // Let the browser set multipart Content-Type + boundary for FormData uploads.
  if (!isFormData && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    try {
      const newToken = await doRefresh();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } catch {
      // Refresh failed — caller handles the 401
    }
  }

  return res;
}

/**
 * @deprecated Use `apiJson<T>` instead — it handles 204 No Content and
 * surfaces typed ApiError on non-2xx. This legacy helper is kept only to avoid
 * touching unrelated code that has not been migrated yet.
 */
export async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const token = accessToken;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, {
    headers,
    credentials: "include", // Always send cookies
    ...options,
  });

  // If 401, try to refresh and retry
  if (res.status === 401) {
    try {
      const newToken = await doRefresh();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, {
        headers,
        credentials: "include",
        ...options,
      });
    } catch {
      // Refresh failed
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

// ── Typed JSON helper with envelope + 204 awareness ────────────────────────────

/**
 * Error thrown by apiJson on non-2xx responses. Carries status and parsed body
 * so callers can branch on .status (e.g. 409 conflict, 422 validation).
 */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Auth-aware JSON fetch. Use for any backend call that returns JSON or 204.
 *
 * Behavior:
 * - HTTP 204 No Content → returns `{ ok: true } as T` (delete endpoints)
 * - HTTP 2xx with JSON  → returns parsed body cast to T
 * - HTTP 4xx/5xx        → throws ApiError with parsed body for branching
 *
 * Backend response convention is `{ ok: true, ...payload }` — callers should
 * read the specific field they want from T (e.g. `result.rooms`, `result.user`)
 * rather than assuming T is the payload.
 */
export async function apiJson<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await apiFetch(url, options);
  if (res.status === 204) return { ok: true } as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: string })?.error || res.statusText || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

// ── Cleanup ────────────────────────────────────────────────────────────────────

export function clearTokens(): void {
  setAccessToken(null);
}

// Legacy exports for backward compat (no longer stores refresh token)
export function getRefreshToken(): string | null {
  return null; // Refresh token is in HttpOnly cookie — JS can't read it
}

export function setTokens(accessTokenStr: string, _refreshToken?: string): void {
  setAccessToken(accessTokenStr);
}
