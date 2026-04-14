import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Mock logger to suppress output during tests
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import { readJSON, writeJSON, ensureDir, ensureDataFiles } from "../fileHandler";

describe("fileHandler", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "filehandler-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── ensureDir ─────────────────────────────────────────────────────

  describe("ensureDir", () => {
    it("creates directory if it does not exist", () => {
      const dir = path.join(tmpDir, "sub", "nested");
      expect(fs.existsSync(dir)).toBe(false);

      ensureDir(dir);

      expect(fs.existsSync(dir)).toBe(true);
    });

    it("does nothing if directory already exists", () => {
      const dir = path.join(tmpDir, "existing");
      fs.mkdirSync(dir);

      // Should not throw
      ensureDir(dir);
      expect(fs.existsSync(dir)).toBe(true);
    });
  });

  // ── readJSON ──────────────────────────────────────────────────────

  describe("readJSON", () => {
    it("returns data from file", () => {
      const filePath = path.join(tmpDir, "data.json");
      fs.writeFileSync(filePath, JSON.stringify({ name: "test", values: [1, 2, 3] }));

      const data = readJSON<{ name: string; values: number[] }>(filePath);

      expect(data).toEqual({ name: "test", values: [1, 2, 3] });
    });

    it("returns cached data on second read (same mtime)", () => {
      const filePath = path.join(tmpDir, "cached.json");
      fs.writeFileSync(filePath, JSON.stringify({ v: 1 }));

      const first = readJSON(filePath);
      const second = readJSON(filePath);

      // Both should return the same data
      expect(first).toEqual({ v: 1 });
      expect(second).toEqual({ v: 1 });
      // They should be the exact same reference (from cache)
      expect(first).toBe(second);
    });

    it("re-reads file when mtime changes", () => {
      const filePath = path.join(tmpDir, "mtime.json");
      fs.writeFileSync(filePath, JSON.stringify({ v: 1 }));

      const first = readJSON(filePath);
      expect(first).toEqual({ v: 1 });

      // Write new content and advance mtime
      // Use utimesSync to bump the modification time
      fs.writeFileSync(filePath, JSON.stringify({ v: 2 }));
      const futureTime = new Date(Date.now() + 5000);
      fs.utimesSync(filePath, futureTime, futureTime);

      const second = readJSON(filePath);
      expect(second).toEqual({ v: 2 });
      expect(second).not.toBe(first);
    });

    it("returns null on file not found", () => {
      const result = readJSON(path.join(tmpDir, "nonexistent.json"));
      expect(result).toBeNull();
    });

    it("returns null on invalid JSON", () => {
      const filePath = path.join(tmpDir, "bad.json");
      fs.writeFileSync(filePath, "not valid json {{{");

      const result = readJSON(filePath);
      expect(result).toBeNull();
    });
  });

  // ── writeJSON ─────────────────────────────────────────────────────

  describe("writeJSON", () => {
    it("writes data that can be read back", () => {
      const filePath = path.join(tmpDir, "write.json");
      const data = { items: ["a", "b"], count: 2 };

      writeJSON(filePath, data);

      const raw = fs.readFileSync(filePath, "utf-8");
      expect(JSON.parse(raw)).toEqual(data);
    });

    it("writes atomically (via tmp + rename, no leftover .tmp)", () => {
      const filePath = path.join(tmpDir, "atomic.json");

      writeJSON(filePath, { safe: true });

      // The .tmp file should not exist after write
      expect(fs.existsSync(filePath + ".tmp")).toBe(false);
      // The actual file should exist
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it("updates cache after write so readJSON returns fresh data", () => {
      const filePath = path.join(tmpDir, "cache-update.json");

      writeJSON(filePath, { v: 1 });
      const first = readJSON(filePath);
      expect(first).toEqual({ v: 1 });

      writeJSON(filePath, { v: 2 });
      const second = readJSON(filePath);
      expect(second).toEqual({ v: 2 });
    });

    it("creates parent directory if it does not exist", () => {
      const filePath = path.join(tmpDir, "deep", "nested", "dir", "file.json");

      writeJSON(filePath, { created: true });

      expect(fs.existsSync(filePath)).toBe(true);
      expect(JSON.parse(fs.readFileSync(filePath, "utf-8"))).toEqual({ created: true });
    });

    it("overwrites existing file", () => {
      const filePath = path.join(tmpDir, "overwrite.json");
      writeJSON(filePath, { old: true });
      writeJSON(filePath, { new: true });

      const data = readJSON(filePath);
      expect(data).toEqual({ new: true });
    });
  });

  // ── ensureDataFiles ───────────────────────────────────────────────

  describe("ensureDataFiles", () => {
    it("creates files with initial data if they do not exist", () => {
      const f1 = path.join(tmpDir, "init1.json");
      const f2 = path.join(tmpDir, "init2.json");

      ensureDataFiles([
        { path: f1, initial: [] },
        { path: f2, initial: { key: "val" } },
      ]);

      expect(readJSON(f1)).toEqual([]);
      expect(readJSON(f2)).toEqual({ key: "val" });
    });

    it("does not overwrite existing files", () => {
      const filePath = path.join(tmpDir, "existing.json");
      writeJSON(filePath, { preserved: true });

      ensureDataFiles([{ path: filePath, initial: { overwritten: true } }]);

      const data = readJSON(filePath);
      expect(data).toEqual({ preserved: true });
    });
  });
});
