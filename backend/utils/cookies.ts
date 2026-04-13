import { Request, Response } from "express";
import { env } from "../config/env";

const REFRESH_TOKEN_COOKIE = "lc_rt";
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const isProduction = env.NODE_ENV === "production";

/**
 * Set the refresh token as an HttpOnly cookie.
 * - HttpOnly: JS can't access it (XSS-proof)
 * - Secure: only sent over HTTPS (production)
 * - SameSite=Lax: protects against CSRF while allowing same-site requests
 * - Path=/api/auth: only sent to auth endpoints (minimizes exposure)
 */
export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

/**
 * Clear the refresh token cookie.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
  });
}

/**
 * Read the refresh token from the request cookie.
 */
export function getRefreshTokenFromCookie(req: Request): string | undefined {
  return (req as unknown as { cookies?: Record<string, string> }).cookies?.[REFRESH_TOKEN_COOKIE];
}

export { REFRESH_TOKEN_COOKIE };
