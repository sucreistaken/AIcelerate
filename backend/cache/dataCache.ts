/**
 * Generic in-memory data cache with write-through + debounced atomic flush.
 *
 * Replaces sync file I/O pattern:
 *   readAll() -> fs.readFileSync -> JSON.parse -> find
 * With:
 *   cache.get(id) -> Map.get(id) -> instant return
 *
 * Writes are applied to memory immediately and flushed to disk asynchronously
 * with debouncing to batch rapid successive writes.
 *
 * Safety guarantees:
 *   - Atomic disk writes (write to .tmp, then rename) — no partial writes
 *   - O(1) for all single-item operations (get, set, delete)
 *   - Ordered list kept in sync via positional index Map
 */

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { logger } from "../utils/logger";

export interface DataCacheOptions {
  /** Path to the JSON file backing this cache */
  filePath: string;
  /** Debounce interval for disk writes (ms). Default: 500 */
  flushDebounceMs?: number;
  /** Entity name for logging */
  name?: string;
  /** Custom key field (default: "id"). Use when the entity's primary key is not "id". */
  keyField?: string;
}

export class DataCache<T extends Record<string, any>> {
  private items: Map<string, T> = new Map();
  private list: T[] = [];
  /** key -> index in list (O(1) positional tracking, replaces O(n) indexOf) */
  private posMap: Map<string, number> = new Map();
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushPromise: Promise<void> | null = null;
  private readonly filePath: string;
  private readonly tmpPath: string;
  private readonly flushDebounceMs: number;
  private readonly name: string;
  private readonly keyField: string;

  // Secondary indexes: field -> value -> Set<key>
  private indexes = new Map<string, Map<string, Set<string>>>();

  constructor(options: DataCacheOptions) {
    this.filePath = options.filePath;
    this.tmpPath = options.filePath + ".tmp";
    this.flushDebounceMs = options.flushDebounceMs ?? 500;
    this.name = options.name ?? path.basename(options.filePath, ".json");
    this.keyField = options.keyField ?? "id";
    this.ensureFile();
    this.loadSync();
  }

  private getKey(item: T): string {
    return String(item[this.keyField]);
  }

  // ── Positional Index Helpers ───────────────────────────────────────

  /** Rebuild posMap from list (called after bulk operations) */
  private rebuildPosMap(): void {
    this.posMap.clear();
    for (let i = 0; i < this.list.length; i++) {
      this.posMap.set(this.getKey(this.list[i]), i);
    }
  }

  // ── Secondary Index Management ─────────────────────────────────────

  /** Register a secondary index for fast lookups by a field */
  addIndex(field: string): this {
    if (!this.indexes.has(field)) {
      this.indexes.set(field, new Map());
      for (const item of this.items.values()) {
        this.indexAdd(field, item);
      }
    }
    return this;
  }

  private indexAdd(field: string, item: T): void {
    const idx = this.indexes.get(field);
    if (!idx) return;
    const val = String(item[field] ?? "");
    if (!idx.has(val)) idx.set(val, new Set());
    idx.get(val)!.add(this.getKey(item));
  }

  private indexRemove(field: string, item: T): void {
    const idx = this.indexes.get(field);
    if (!idx) return;
    const val = String(item[field] ?? "");
    idx.get(val)?.delete(this.getKey(item));
  }

  private indexRemoveAll(item: T): void {
    for (const field of this.indexes.keys()) {
      this.indexRemove(field, item);
    }
  }

  private indexAddAll(item: T): void {
    for (const field of this.indexes.keys()) {
      this.indexAdd(field, item);
    }
  }

  private rebuildAllIndexes(): void {
    for (const idx of this.indexes.values()) idx.clear();
    for (const item of this.items.values()) {
      this.indexAddAll(item);
    }
  }

  // ── Read Operations (all from memory, O(1) or O(n)) ───────────────

  get(key: string): T | null {
    return this.items.get(key) ?? null;
  }

  getAll(): T[] {
    return this.list;
  }

  /** Get items by an indexed field value. O(1) lookup + O(k) collect. */
  getByIndex(field: string, value: string): T[] {
    const idx = this.indexes.get(field);
    if (!idx) {
      return this.list.filter((item) => String(item[field]) === value);
    }
    const keys = idx.get(value);
    if (!keys || keys.size === 0) return [];
    const result: T[] = [];
    for (const k of keys) {
      const item = this.items.get(k);
      if (item) result.push(item);
    }
    return result;
  }

  find(predicate: (item: T) => boolean): T | null {
    for (const item of this.items.values()) {
      if (predicate(item)) return item;
    }
    return null;
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.list.filter(predicate);
  }

  count(): number {
    return this.items.size;
  }

  // ── Write Operations (memory-immediate + debounced disk flush) ─────

  set(item: T): void {
    const key = this.getKey(item);
    const existing = this.items.get(key);
    if (existing) {
      this.indexRemoveAll(existing);
      // O(1) positional update via posMap
      const pos = this.posMap.get(key);
      if (pos !== undefined && pos < this.list.length) {
        this.list[pos] = item;
      }
    } else {
      const pos = this.list.length;
      this.list.push(item);
      this.posMap.set(key, pos);
    }
    this.items.set(key, item);
    this.indexAddAll(item);
    this.scheduleDiskFlush();
  }

  /** Bulk set — replaces entire dataset. O(n) rebuild. */
  setAll(items: T[]): void {
    this.items.clear();
    this.list = [...items];
    for (const item of items) {
      this.items.set(this.getKey(item), item);
    }
    this.rebuildPosMap();
    this.rebuildAllIndexes();
    this.scheduleDiskFlush();
  }

  upsert(partial: Partial<T> & Record<string, any>): T {
    const key = String(partial[this.keyField]);
    const existing = this.items.get(key);
    if (existing) {
      const updated = { ...existing, ...partial } as T;
      this.indexRemoveAll(existing);
      const pos = this.posMap.get(key);
      if (pos !== undefined && pos < this.list.length) {
        this.list[pos] = updated;
      }
      this.items.set(key, updated);
      this.indexAddAll(updated);
    } else {
      const item = partial as T;
      this.posMap.set(key, this.list.length);
      this.list.push(item);
      this.items.set(key, item);
      this.indexAddAll(item);
    }
    this.scheduleDiskFlush();
    return this.items.get(key)!;
  }

  delete(key: string): boolean {
    const existing = this.items.get(key);
    if (!existing) return false;
    this.indexRemoveAll(existing);
    this.items.delete(key);
    const pos = this.posMap.get(key);
    if (pos !== undefined && pos < this.list.length) {
      // Swap-remove: move last element to deleted position (O(1))
      const lastIdx = this.list.length - 1;
      if (pos < lastIdx) {
        const movedItem = this.list[lastIdx];
        this.list[pos] = movedItem;
        this.posMap.set(this.getKey(movedItem), pos);
      }
      this.list.pop();
    }
    this.posMap.delete(key);
    this.scheduleDiskFlush();
    return true;
  }

  // ── Disk Persistence ──────────────────────────────────────────────

  private ensureFile(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "[]", "utf-8");
    }
  }

  private loadSync(): void {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as T[];
      this.items.clear();
      this.list = parsed;
      for (const item of parsed) {
        this.items.set(this.getKey(item), item);
      }
      this.rebuildPosMap();
      this.rebuildAllIndexes();
    } catch (err) {
      logger.error({ err, cache: this.name }, "DataCache: failed to load from disk");
      this.items.clear();
      this.list = [];
      this.posMap.clear();
    }
  }

  private scheduleDiskFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushToDisk();
    }, this.flushDebounceMs);
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  /** Atomic flush: write to .tmp then rename (no partial writes on crash) */
  private flushToDisk(): void {
    if (!this.dirty) return;
    const snapshot = JSON.stringify(this.list, null, 2);
    this.dirty = false;
    this.flushPromise = fsp
      .writeFile(this.tmpPath, snapshot, "utf-8")
      .then(() => fsp.rename(this.tmpPath, this.filePath))
      .catch((err) => {
        logger.error({ err, cache: this.name }, "DataCache: atomic flush failed");
        this.dirty = true; // Retry on next write
      })
      .finally(() => {
        this.flushPromise = null;
      });
  }

  /** Force immediate flush (call before shutdown) */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirty) {
      this.flushToDisk();
    }
    if (this.flushPromise) {
      await this.flushPromise;
    }
  }

  /** Reload from disk (useful after external modification) */
  reload(): void {
    this.loadSync();
  }
}
