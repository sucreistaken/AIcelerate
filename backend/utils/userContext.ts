import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped user context.
 * Used to track per-user resource usage (AI tokens, etc.) without threading
 * userId through every function signature.
 */
interface UserContext {
  userId: string;
}

const storage = new AsyncLocalStorage<UserContext>();

/**
 * Run a callback inside a user-scoped context.
 * Anywhere downstream can call `getCurrentUserId()` to retrieve it.
 */
export function runWithUser<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

/**
 * Get the current request's userId, or null if not in a user-scoped context.
 */
export function getCurrentUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}
