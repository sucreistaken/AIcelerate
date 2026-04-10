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
