import { logger } from "./logger";
// backend/utils/fileHandler.ts
import fs from "fs";
import path from "path";

export const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

// mtime-based cache for readJSON — avoids repeated readFileSync + JSON.parse
// Max 200 entries to prevent unbounded memory growth
const JSON_CACHE_MAX = 200;
const jsonCache = new Map<string, { data: unknown; mtime: number }>();

export const readJSON = <T = unknown>(filePath: string): T | null => {
  try {
    if (!fs.existsSync(filePath)) return null;

    const stat = fs.statSync(filePath);
    const cached = jsonCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.data as T;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as T;

    // Re-check mtime after read to detect concurrent modification (TOCTOU safety)
    const statAfter = fs.statSync(filePath);

    // Evict oldest entry if at capacity
    if (jsonCache.size >= JSON_CACHE_MAX && !jsonCache.has(filePath)) {
      const firstKey = jsonCache.keys().next().value;
      if (firstKey !== undefined) jsonCache.delete(firstKey);
    }
    jsonCache.set(filePath, { data, mtime: statAfter.mtimeMs });
    return data;
  } catch (e) {
    logger.error("readJSON error:", e);
    return null;
  }
};

export const writeJSON = (filePath: string, data: unknown) => {
  try {
    ensureDir(path.dirname(filePath));
    // Atomic write: write to .tmp then rename (no partial writes on crash)
    const tmpPath = filePath + ".tmp";
    const indent = process.env.NODE_ENV === "production" ? undefined : 2;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, indent), "utf-8");
    fs.renameSync(tmpPath, filePath);
    // Update cache immediately
    try {
      const stat = fs.statSync(filePath);
      jsonCache.set(filePath, { data, mtime: stat.mtimeMs });
    } catch {
      jsonCache.delete(filePath);
    }
  } catch (e) {
    logger.error("writeJSON error:", e);
  }
};

export const ensureDataFiles = (files: Array<{ path: string; initial: unknown }>) => {
  for (const f of files) {
    ensureDir(path.dirname(f.path));
    if (!fs.existsSync(f.path)) {
      writeJSON(f.path, f.initial);
    }
  }
};
