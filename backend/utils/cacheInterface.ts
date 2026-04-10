/**
 * Abstract cache interface — TTLCache implements this now,
 * and a RedisCacheAdapter can be dropped in later without changing consumers.
 */
export interface CacheInterface<T> {
  get(key: string): T | undefined | Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): void | Promise<void>;
  del(key: string): boolean | Promise<boolean>;
  invalidate(pattern: string): number | Promise<number>;
  getOrSet(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T>;
  clear(): void | Promise<void>;
  readonly size: number;
}
