/**
 * TTL-based computed value cache with manual invalidation + periodic sweep.
 * Used for expensive aggregations like getCourseProgress, rebuildKnowledgeIndex.
 */

export class ComputedCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private sweepTimer: ReturnType<typeof setInterval>;

  constructor(ttlMs: number, maxSize = 500) {
    this.defaultTtlMs = ttlMs;
    this.maxSize = maxSize;

    // Sweep expired entries every 2 minutes to prevent memory leak
    this.sweepTimer = setInterval(() => this.sweep(), 120_000);
    this.sweepTimer.unref(); // Don't block shutdown
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict if over max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // Remove the entry closest to expiring
      let oldestKey: string | null = null;
      let oldestExpiry = Infinity;
      for (const [k, e] of this.store) {
        if (e.expiresAt < oldestExpiry) {
          oldestExpiry = e.expiresAt;
          oldestKey = k;
        }
      }
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all keys matching a prefix (e.g. "course:*") */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  /** Remove all expired entries */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }

  destroy(): void {
    clearInterval(this.sweepTimer);
    this.store.clear();
  }
}
