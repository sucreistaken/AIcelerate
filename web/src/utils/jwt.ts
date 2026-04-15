/**
 * JWT payload introspection (no signature verification — client-side only).
 *
 * We never trust these values for security — they're used to decide when to
 * proactively refresh a token before it expires, so a malformed token is
 * treated the same as an expired one (force refresh / re-auth).
 */

interface JwtPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Decode the payload of a JWT. Returns null for malformed tokens.
 * Safe against non-ASCII chars (atob + escape handle base64url).
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const b64 = token.split(".")[1];
    if (!b64) return null;
    // base64url → base64
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns token expiry as epoch ms, or null if missing/malformed.
 */
export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

/**
 * True if token is already expired OR within `bufferMs` of expiry OR malformed.
 * Default buffer = 60s — refresh proactively so in-flight requests don't 401.
 */
export function isTokenNearExpiry(token: string, bufferMs = 60_000): boolean {
  const expiresAt = getTokenExpiryMs(token);
  if (expiresAt === null) return true;
  return expiresAt - Date.now() <= bufferMs;
}
