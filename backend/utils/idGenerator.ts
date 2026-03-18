/** Generate a random ID with optional prefix: `prefix-timestamp-random` */
export function generateId(prefix?: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}-${Date.now()}-${rand}` : `${ts}${rand}`;
}

/** Short unique ID (no prefix) */
export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
