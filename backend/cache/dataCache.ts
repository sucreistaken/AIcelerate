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
 *
 * MongoDB backing (optional):
 *   When a mongoModel is provided, MongoDB becomes the source of truth.
 *   - On init: loads from JSON synchronously, then replaces with MongoDB data via init()
 *   - On flush: syncs dirty/deleted items to MongoDB via bulkWrite, then writes JSON backup
 *   - Backward-compatible: caches without mongoModel still use JSON-only
 */

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import type { Model } from "mongoose";
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
  /** Optional Mongoose model — when provided, MongoDB becomes the source of truth */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose Model generics require any
  mongoModel?: Model<any>;
  /**
   * Map the cache keyField to a different MongoDB field for queries.
   * Example: keyField "id" maps to "_id" in MongoDB for Lesson/Flashcard/Course.
   * Defaults to the same value as keyField.
   */
  mongoKeyField?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic cache needs flexible constraint
export class DataCache<T extends Record<string, any>> {
  private items: Map<string, T> = new Map();
  private list: T[] = [];
  /** key -> index in list (O(1) positional tracking, replaces O(n) indexOf) */
  private posMap: Map<string, number> = new Map();
  private dirty = false;
  private flushing = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushPromise: Promise<void> | null = null;
  private readonly filePath: string;
  private readonly tmpPath: string;
  private readonly flushDebounceMs: number;
  private readonly name: string;
  private readonly keyField: string;

  // MongoDB backing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose Model generics require any
  private readonly mongoModel?: Model<any>;
  private readonly mongoKeyField: string;
  private _dirtyIds: Set<string> = new Set();
  private _deletedIds: Set<string> = new Set();
  private _mongoReady = false;
  private _initPromise: Promise<void> | null = null;

  // Secondary indexes: field -> value -> Set<key>
  private indexes = new Map<string, Map<string, Set<string>>>();

  constructor(options: DataCacheOptions) {
    this.filePath = options.filePath;
    this.tmpPath = options.filePath + ".tmp";
    this.flushDebounceMs = options.flushDebounceMs ?? 500;
    this.name = options.name ?? path.basename(options.filePath, ".json");
    this.keyField = options.keyField ?? "id";
    this.mongoModel = options.mongoModel;
    this.mongoKeyField = options.mongoKeyField ?? this.keyField;
    this.ensureFile();
    this.loadSync();
  }

  // ── MongoDB Initialization ─────────────────────────────────────────

  /**
   * Async initialization: load data from MongoDB (replacing JSON data).
   * Call this after the database connection is established.
   * Safe to call multiple times — subsequent calls return the same promise.
   */
  async init(): Promise<void> {
    if (!this.mongoModel) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._loadFromMongo();
    return this._initPromise;
  }

  /** Whether MongoDB backing is connected and active */
  get mongoReady(): boolean {
    return this._mongoReady;
  }

  private async _loadFromMongo(): Promise<void> {
    if (!this.mongoModel) return;
    try {
      const docs = await this.mongoModel.find({}).lean().exec();
      const items = docs.map((doc) => this._mongoDocToItem(doc as Record<string, unknown>));
      this.items.clear();
      this.list = items;
      for (const item of items) {
        this.items.set(this.getKey(item), item);
      }
      this.rebuildPosMap();
      this.rebuildAllIndexes();
      this._dirtyIds.clear();
      this._deletedIds.clear();
      this._mongoReady = true;
      logger.info(
        { cache: this.name, count: items.length },
        "DataCache: loaded from MongoDB"
      );
    } catch (err) {
      logger.error(
        { err, cache: this.name },
        "DataCache: failed to load from MongoDB, keeping JSON data"
      );
      // Keep whatever was loaded from JSON — it serves as fallback
    }
  }

  /**
   * Convert a Mongoose lean doc to a cache item.
   * Handles _id -> keyField mapping and strips Mongoose internals.
   */
  private _mongoDocToItem(doc: Record<string, unknown>): T {
    const item = { ...doc };
    if (this.mongoKeyField === "_id" && this.keyField !== "_id") {
      // Mongo key is _id but cache key is different (e.g., "id"):
      // copy _id value to the cache keyField, then remove _id
      item[this.keyField] = String(item._id);
      delete item._id;
    } else if (this.mongoKeyField !== "_id") {
      // Mongo key is a regular field (e.g., "lessonId"); the doc may have
      // an auto-generated _id that doesn't belong in the cache item
      delete item._id;
    }
    // Remove Mongoose version key if present
    delete item.__v;
    return item as T;
  }

  /**
   * Convert a cache item to a MongoDB document for upsert.
   * Handles keyField -> _id mapping when mongoKeyField is "_id".
   */
  private _itemToMongoDoc(item: T): Record<string, unknown> {
    const doc: Record<string, unknown> = { ...(item as Record<string, unknown>) };
    if (this.mongoKeyField === "_id" && this.keyField !== "_id") {
      doc._id = doc[this.keyField];
    }
    return doc;
  }

  /**
   * Build the MongoDB filter for a given cache key.
   */
  private _mongoFilter(key: string): Record<string, unknown> {
    return { [this.mongoKeyField]: key };
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
    this._dirtyIds.add(key);
    this._deletedIds.delete(key); // un-delete if it was pending deletion
    this.scheduleDiskFlush();
  }

  /** Bulk set — replaces entire dataset. O(n) rebuild. */
  setAll(items: T[]): void {
    // Track all old keys as deleted, all new keys as dirty (for MongoDB sync)
    if (this.mongoModel) {
      for (const key of this.items.keys()) {
        this._deletedIds.add(key);
      }
    }
    this.items.clear();
    this.list = [...items];
    for (const item of items) {
      const key = this.getKey(item);
      this.items.set(key, item);
      this._dirtyIds.add(key);
      this._deletedIds.delete(key); // new items override pending deletes
    }
    this.rebuildPosMap();
    this.rebuildAllIndexes();
    this.scheduleDiskFlush();
  }

  upsert(partial: Partial<T> & Record<string, unknown>): T {
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
    this._dirtyIds.add(key);
    this._deletedIds.delete(key);
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
    this._dirtyIds.delete(key);
    this._deletedIds.add(key);
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
    if (!this.dirty || this.flushing) return;
    this.flushing = true;
    const indent = process.env.NODE_ENV === "production" ? undefined : 2;
    const snapshot = JSON.stringify(this.list, null, indent);
    this.dirty = false;

    // Capture dirty/deleted sets for this flush cycle and reset immediately
    // so new writes during flush are tracked in fresh sets
    const dirtySnapshot = new Set(this._dirtyIds);
    const deletedSnapshot = new Set(this._deletedIds);
    this._dirtyIds.clear();
    this._deletedIds.clear();

    // Build the async flush chain: MongoDB first (source of truth), then JSON backup
    const mongoFlush = this._mongoReady
      ? this._flushToMongo(dirtySnapshot, deletedSnapshot)
      : Promise.resolve();

    this.flushPromise = mongoFlush
      .then(() =>
        fsp
          .writeFile(this.tmpPath, snapshot, "utf-8")
          .then(() => fsp.rename(this.tmpPath, this.filePath))
      )
      .catch((err) => {
        logger.error({ err, cache: this.name }, "DataCache: flush failed");
        this.dirty = true; // Retry on next write
        // Re-merge snapshots back so they retry on next flush
        for (const id of dirtySnapshot) this._dirtyIds.add(id);
        for (const id of deletedSnapshot) this._deletedIds.add(id);
      })
      .finally(() => {
        this.flushing = false;
        this.flushPromise = null;
      });
  }

  /** Sync dirty/deleted items to MongoDB via bulkWrite */
  private async _flushToMongo(
    dirtyIds: Set<string>,
    deletedIds: Set<string>
  ): Promise<void> {
    if (!this.mongoModel || (dirtyIds.size === 0 && deletedIds.size === 0)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose bulkWrite requires any[]
    const ops: any[] = [];

    for (const id of dirtyIds) {
      const item = this.items.get(id);
      if (item) {
        const doc = this._itemToMongoDoc(item);
        ops.push({
          updateOne: {
            filter: this._mongoFilter(id),
            update: { $set: doc },
            upsert: true,
          },
        });
      }
    }

    for (const id of deletedIds) {
      ops.push({
        deleteOne: { filter: this._mongoFilter(id) },
      });
    }

    if (ops.length > 0) {
      try {
        await this.mongoModel.bulkWrite(ops, { ordered: false });
        logger.info(
          { cache: this.name, upserts: dirtyIds.size, deletes: deletedIds.size },
          "DataCache: flushed to MongoDB"
        );
      } catch (err) {
        logger.error(
          { err, cache: this.name },
          "DataCache: MongoDB bulkWrite failed"
        );
        throw err; // Let the caller handle retry logic
      }
    }
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

  /**
   * Reload from MongoDB. Returns a promise that resolves when complete.
   * Falls back to JSON reload if mongoModel is not configured.
   */
  async reloadFromMongo(): Promise<void> {
    if (!this.mongoModel) {
      this.loadSync();
      return;
    }
    await this._loadFromMongo();
  }
}
