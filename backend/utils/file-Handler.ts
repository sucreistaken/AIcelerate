import { logger } from "./logger";
// backend/utils/fileHandler.ts
import fs from "fs";
import path from "path";

export const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

// mtime-based cache for readJSON — avoids repeated readFileSync + JSON.parse
const jsonCache = new Map<string, { data: unknown; mtime: number }>();

export const readJSON = <T = any>(filePath: string): T | null => {
  try {
    if (!fs.existsSync(filePath)) return null;

    const stat = fs.statSync(filePath);
    const cached = jsonCache.get(filePath);
    if (cached && cached.mtime === stat.mtimeMs) {
      return cached.data as T;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as T;
    jsonCache.set(filePath, { data, mtime: stat.mtimeMs });
    return data;
  } catch (e) {
    logger.error("readJSON error:", e);
    return null;
  }
};

export const writeJSON = (filePath: string, data: unknown) => {
  try {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
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

export const ensureDataFiles = (files: Array<{ path: string; initial: any }>) => {
  for (const f of files) {
    ensureDir(path.dirname(f.path));
    if (!fs.existsSync(f.path)) {
      writeJSON(f.path, f.initial);
    }
  }
};
