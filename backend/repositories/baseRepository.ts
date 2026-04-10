import fs from "fs";
import path from "path";
import type { IRepository } from "./IRepository";

export class BaseRepository<T extends { id: string }> implements IRepository<T> {
  private filePath: string;
  private lockMap = new Map<string, Promise<void>>();

  // In-memory cache to avoid repeated fs.readFileSync + JSON.parse
  private _cache: T[] | null = null;
  private _cacheMtime: number = 0;

  constructor(filePath: string, private defaultData: T[] = []) {
    this.filePath = filePath;
    this.ensureFile();
  }

  private ensureFile(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify(this.defaultData, null, 2), "utf-8");
      }
    } catch (err) {
      console.error(`[BaseRepository] Failed to ensure file ${this.filePath}:`, err);
    }
  }

  private async withLock<R>(fn: () => Promise<R>): Promise<R> {
    const key = this.filePath;
    const prev = this.lockMap.get(key) ?? Promise.resolve();
    let resolve: () => void;
    const next = new Promise<void>((r) => { resolve = r; });
    this.lockMap.set(key, next);
    await prev;
    try {
      return await fn();
    } finally {
      resolve!();
      if (this.lockMap.get(key) === next) this.lockMap.delete(key);
    }
  }

  protected readAll(): T[] {
    try {
      if (!fs.existsSync(this.filePath)) return [];

      // Check if file has changed since last read (mtime-based cache invalidation)
      const stat = fs.statSync(this.filePath);
      const mtime = stat.mtimeMs;

      if (this._cache !== null && mtime === this._cacheMtime) {
        return this._cache;
      }

      const data = fs.readFileSync(this.filePath, "utf-8");
      this._cache = JSON.parse(data) as T[];
      this._cacheMtime = mtime;
      return this._cache;
    } catch (err) {
      console.error(`[BaseRepository] Failed to read ${this.filePath}:`, err);
      return [];
    }
  }

  protected writeAll(items: T[]): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), "utf-8");
    // Update cache immediately after write (avoid re-read)
    this._cache = items;
    try {
      const stat = fs.statSync(this.filePath);
      this._cacheMtime = stat.mtimeMs;
    } catch {
      this._cacheMtime = Date.now();
    }
  }

  async findAll(): Promise<T[]> {
    return this.readAll();
  }

  async findById(id: string): Promise<T | null> {
    const items = this.readAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async findBy(predicate: (item: T) => boolean): Promise<T[]> {
    return this.readAll().filter(predicate);
  }

  async findOneBy(predicate: (item: T) => boolean): Promise<T | null> {
    return this.readAll().find(predicate) ?? null;
  }

  async create(item: T): Promise<T> {
    return this.withLock(async () => {
      const items = this.readAll();
      items.push(item);
      this.writeAll(items);
      return item;
    });
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    return this.withLock(async () => {
      const items = this.readAll();
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return null;
      items[idx] = { ...items[idx], ...updates, id };
      this.writeAll(items);
      return items[idx];
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.withLock(async () => {
      const items = this.readAll();
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      this.writeAll(filtered);
      return true;
    });
  }

  async count(): Promise<number> {
    return this.readAll().length;
  }

  async upsert(item: T): Promise<T> {
    return this.withLock(async () => {
      const items = this.readAll();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx === -1) {
        items.push(item);
      } else {
        items[idx] = item;
      }
      this.writeAll(items);
      return item;
    });
  }

  setFilePath(filePath: string): void {
    this.filePath = filePath;
    this.ensureFile();
  }

  getFilePath(): string {
    return this.filePath;
  }
}
