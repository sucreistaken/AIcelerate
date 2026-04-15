/**
 * Quota-safe `localStorage` wrapper for Zustand `persist` middleware.
 *
 * Problem: localStorage has a ~5-10MB per-origin quota. Once we persist the
 * lesson list (lite), a user with hundreds of lessons plus other persisted
 * stores can push us over the limit. Vanilla localStorage throws
 * `DOMException: QuotaExceededError` and Zustand silently drops the write,
 * leading to phantom "reset on next reload" bugs.
 *
 * Strategy on write:
 *   1. Try the write.
 *   2. On quota exception, prune bulk fields from the same blob (trim the
 *      lessons array to the most recent N) and retry once.
 *   3. If it still fails, remove the key entirely — better to lose the cache
 *      than to crash the app.
 *
 * Returns a string-based `Storage`-compatible object suitable for
 * `createJSONStorage(() => quotaSafeLocalStorage())`.
 */

import { logger } from "./logger";

const PRUNE_LESSONS_KEEP = 100;

interface RawPersistedBlob {
  state?: {
    lessons?: unknown[];
    [k: string]: unknown;
  };
  version?: number;
  [k: string]: unknown;
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name === "QuotaExceededError" ||
    err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    err.message.includes("quota") ||
    err.message.includes("QuotaExceeded")
  );
}

function pruneBlob(raw: string): string | null {
  try {
    const blob = JSON.parse(raw) as RawPersistedBlob;
    const state = blob.state;
    if (!state) return null;
    if (Array.isArray(state.lessons) && state.lessons.length > PRUNE_LESSONS_KEEP) {
      state.lessons = state.lessons.slice(-PRUNE_LESSONS_KEEP);
      return JSON.stringify(blob);
    }
    return null;
  } catch {
    return null;
  }
}

function write(name: string, value: string): void {
  try {
    window.localStorage.setItem(name, value);
    return;
  } catch (err) {
    if (!isQuotaError(err)) {
      logger.warn({ key: name, err: (err as Error).message }, "persist write failed (non-quota)");
      return;
    }
  }
  const pruned = pruneBlob(value);
  if (pruned) {
    try {
      window.localStorage.setItem(name, pruned);
      logger.warn({ key: name }, "persist: pruned lesson list to fit localStorage quota");
      return;
    } catch { /* fall through */ }
  }
  try {
    window.localStorage.removeItem(name);
    logger.warn({ key: name }, "persist: quota exceeded, dropped cache to keep app running");
  } catch { /* give up silently */ }
}

/**
 * Returns a `Storage`-like object (string-based) intended to be wrapped in
 * Zustand's `createJSONStorage(() => quotaSafeLocalStorage())`.
 */
export function quotaSafeLocalStorage() {
  return {
    getItem: (name: string): string | null => {
      try {
        return window.localStorage.getItem(name);
      } catch (err) {
        logger.warn({ key: name, err: (err as Error).message }, "persist read failed — starting clean");
        return null;
      }
    },
    setItem: (name: string, value: string): void => write(name, value),
    removeItem: (name: string): void => {
      try {
        window.localStorage.removeItem(name);
      } catch { /* ignore */ }
    },
  };
}
