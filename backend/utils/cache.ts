/**
 * Generic in-memory TTL cache with LRU eviction.
 *
 * Features:
 * - Type-safe get/set/del
 * - Automatic TTL expiration (lazy + periodic sweep)
 * - Optional max size with LRU eviction
 * - Cache-aside pattern helper: getOrSet()
 * - Pattern-based invalidation: invalidate("room:*")
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

export class TTLCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxSize: number;
  private sweepInterval: ReturnType<typeof setInterval>;

  constructor(options: { ttlMs: number; maxSize?: number; sweepIntervalMs?: number }) {
    this.defaultTtlMs = options.ttlMs;
    this.maxSize = options.maxSize || 1000;

    // Periodic sweep every 60s (or custom)
    this.sweepInterval = setInterval(() => this.sweep(), options.sweepIntervalMs || 60_000);
    this.sweepInterval.unref(); // Don't block shutdown
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    entry.lastAccessed = Date.now();
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // LRU eviction if at max capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      lastAccessed: Date.now(),
    });
  }

  /**
   * Cache-aside pattern: get from cache, or compute and cache the result.
   */
  async getOrSet(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  del(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a glob-like pattern.
   * Supports trailing wildcard: "room:*" matches "room:123", "room:456"
   */
  invalidate(pattern: string): number {
    if (!pattern.includes("*")) {
      return this.del(pattern) ? 1 : 0;
    }

    const prefix = pattern.replace(/\*$/, "");
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }

  destroy(): void {
    clearInterval(this.sweepInterval);
    this.store.clear();
  }
}

// ── Pre-configured cache instances ─────────────────────────────────────────────

/** Room data cache: 60s TTL, up to 200 entries */
export const roomCache = new TTLCache<any>({ ttlMs: 60_000, maxSize: 200 });

/** User profile cache: 30s TTL, up to 500 entries */
export const userCache = new TTLCache<any>({ ttlMs: 30_000, maxSize: 500 });
