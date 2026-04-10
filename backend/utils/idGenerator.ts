import crypto from "crypto";

/** Generate a random ID with optional prefix: `prefix-timestamp-random` */
export function generateId(prefix?: string): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return prefix ? `${prefix}-${Date.now()}-${rand}` : `${ts}${rand}`;
}

/** Short unique ID (no prefix) */
export function uid(): string {
  return crypto.randomBytes(6).toString("hex") + Date.now().toString(36);
}
