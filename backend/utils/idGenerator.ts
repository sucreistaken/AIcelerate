import crypto from "crypto";

/** Generate a random ID with optional prefix: `prefix-<uuid>` */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id}` : id;
}

/** Short unique ID (no prefix) */
export function uid(): string {
  return crypto.randomUUID();
}
