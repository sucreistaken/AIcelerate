/**
 * Request deduplication via singleton promise pattern.
 *
 * If a request with the same key is already in-flight, the existing promise is
 * returned instead of firing a duplicate. After completion the slot is freed
 * so the next call goes to the network.
 *
 * Usage:
 *   const data = await dedup("courses", () => courseApi.getAll());
 *
 * Optional TTL: within `ttlMs` of a successful response, the cached result is
 * returned instantly without a network call.
 */

const inflight = new Map<string, { promise: Promise<any>; ts: number }>();

export function dedup<T>(key: string, fn: () => Promise<T>, ttlMs = 0): Promise<T> {
  const cached = inflight.get(key);

  // Return in-flight or TTL-fresh result
  if (cached) {
    if (ttlMs > 0 && Date.now() - cached.ts < ttlMs) return cached.promise as Promise<T>;
    if (cached.ts === 0) return cached.promise as Promise<T>; // Still in-flight (ts=0)
  }

  const promise = fn().finally(() => {
    // Mark completion time for TTL, or remove if no TTL
    if (ttlMs > 0) {
      const entry = inflight.get(key);
      if (entry?.promise === promise) entry.ts = Date.now();
    } else {
      inflight.delete(key);
    }
  });

  inflight.set(key, { promise, ts: 0 }); // ts=0 means in-flight
  return promise;
}
