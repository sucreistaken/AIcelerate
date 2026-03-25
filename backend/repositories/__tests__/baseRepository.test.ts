import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { BaseRepository } from "../baseRepository";

interface TestEntity {
  id: string;
  name: string;
  value?: number;
}

function tmpPath(): string {
  return path.join(os.tmpdir(), `test-repo-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("BaseRepository", () => {
  let filePath: string;
  let repo: BaseRepository<TestEntity>;

  beforeEach(() => {
    filePath = tmpPath();
    repo = new BaseRepository<TestEntity>(filePath);
  });

  afterEach(() => {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  });

  it("constructor creates the file with empty array", () => {
    expect(fs.existsSync(filePath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(data).toEqual([]);
  });

  it("constructor uses defaultData when provided", () => {
    const customPath = tmpPath();
    const defaults: TestEntity[] = [{ id: "d1", name: "Default" }];
    new BaseRepository<TestEntity>(customPath, defaults);
    const data = JSON.parse(fs.readFileSync(customPath, "utf-8"));
    expect(data).toEqual(defaults);
    try { fs.unlinkSync(customPath); } catch { /* ignore */ }
  });

  describe("findAll", () => {
    it("returns empty array for a fresh repo", async () => {
      const items = await repo.findAll();
      expect(items).toEqual([]);
    });

    it("returns all items after creates", async () => {
      await repo.create({ id: "a", name: "Alpha" });
      await repo.create({ id: "b", name: "Beta" });
      const items = await repo.findAll();
      expect(items).toHaveLength(2);
    });
  });

  describe("findById", () => {
    it("returns null when item does not exist", async () => {
      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });

    it("returns the correct item by id", async () => {
      await repo.create({ id: "x1", name: "Entity X" });
      const result = await repo.findById("x1");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Entity X");
    });
  });

  describe("findBy", () => {
    it("returns items matching predicate", async () => {
      await repo.create({ id: "1", name: "Alice", value: 10 });
      await repo.create({ id: "2", name: "Bob", value: 20 });
      await repo.create({ id: "3", name: "Alice", value: 30 });
      const results = await repo.findBy((item) => item.name === "Alice");
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.name === "Alice")).toBe(true);
    });

    it("returns empty array when no items match", async () => {
      await repo.create({ id: "1", name: "Alice" });
      const results = await repo.findBy((item) => item.name === "Charlie");
      expect(results).toEqual([]);
    });
  });

  describe("findOneBy", () => {
    it("returns first matching item", async () => {
      await repo.create({ id: "1", name: "X", value: 1 });
      await repo.create({ id: "2", name: "Y", value: 2 });
      const result = await repo.findOneBy((item) => item.value === 2);
      expect(result).not.toBeNull();
      expect(result!.id).toBe("2");
    });

    it("returns null when no item matches", async () => {
      const result = await repo.findOneBy((item) => item.name === "Z");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("adds an item and returns it", async () => {
      const item = await repo.create({ id: "c1", name: "Created" });
      expect(item.id).toBe("c1");
      expect(item.name).toBe("Created");
      const all = await repo.findAll();
      expect(all).toHaveLength(1);
    });

    it("persists to the file", async () => {
      await repo.create({ id: "p1", name: "Persisted" });
      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(raw).toHaveLength(1);
      expect(raw[0].id).toBe("p1");
    });
  });

  describe("update", () => {
    it("updates an existing item and returns it", async () => {
      await repo.create({ id: "u1", name: "Old", value: 1 });
      const updated = await repo.update("u1", { name: "New" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New");
      expect(updated!.value).toBe(1); // preserved
    });

    it("returns null for non-existent id", async () => {
      const result = await repo.update("missing", { name: "X" });
      expect(result).toBeNull();
    });

    it("preserves the original id even if updates include id", async () => {
      await repo.create({ id: "u2", name: "Test" });
      const updated = await repo.update("u2", { id: "hacked", name: "Hacked" } as any);
      expect(updated!.id).toBe("u2");
    });
  });

  describe("delete", () => {
    it("removes the item and returns true", async () => {
      await repo.create({ id: "d1", name: "ToDelete" });
      const result = await repo.delete("d1");
      expect(result).toBe(true);
      const all = await repo.findAll();
      expect(all).toHaveLength(0);
    });

    it("returns false for non-existent id", async () => {
      const result = await repo.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("upsert", () => {
    it("inserts a new item when id does not exist", async () => {
      const item = await repo.upsert({ id: "up1", name: "Upserted" });
      expect(item.name).toBe("Upserted");
      expect(await repo.count()).toBe(1);
    });

    it("replaces an existing item when id matches", async () => {
      await repo.create({ id: "up2", name: "Original", value: 5 });
      await repo.upsert({ id: "up2", name: "Replaced", value: 10 });
      const found = await repo.findById("up2");
      expect(found!.name).toBe("Replaced");
      expect(found!.value).toBe(10);
      expect(await repo.count()).toBe(1);
    });
  });

  describe("count", () => {
    it("returns 0 for empty repo", async () => {
      expect(await repo.count()).toBe(0);
    });

    it("returns correct count after adds", async () => {
      await repo.create({ id: "1", name: "A" });
      await repo.create({ id: "2", name: "B" });
      expect(await repo.count()).toBe(2);
    });
  });

  describe("withLock concurrency", () => {
    it("two concurrent writes do not lose data", async () => {
      // Fire two creates simultaneously
      const [a, b] = await Promise.all([
        repo.create({ id: "c-a", name: "A" }),
        repo.create({ id: "c-b", name: "B" }),
      ]);
      expect(a.id).toBe("c-a");
      expect(b.id).toBe("c-b");
      const all = await repo.findAll();
      expect(all).toHaveLength(2);
      const ids = all.map((i) => i.id).sort();
      expect(ids).toEqual(["c-a", "c-b"]);
    });

    it("concurrent updates do not overwrite each other", async () => {
      await repo.create({ id: "cu1", name: "Start", value: 0 });
      await Promise.all([
        repo.update("cu1", { name: "Update1" }),
        repo.update("cu1", { value: 99 }),
      ]);
      const item = await repo.findById("cu1");
      // The second update wins for value, but both should have run sequentially
      expect(item).not.toBeNull();
      // At minimum, the value should be 99 since the second update ran last
      expect(item!.value).toBe(99);
    });
  });

  describe("setFilePath / getFilePath", () => {
    it("returns the file path", () => {
      expect(repo.getFilePath()).toBe(filePath);
    });

    it("changes file path and creates new file", () => {
      const newPath = tmpPath();
      repo.setFilePath(newPath);
      expect(repo.getFilePath()).toBe(newPath);
      expect(fs.existsSync(newPath)).toBe(true);
      try { fs.unlinkSync(newPath); } catch { /* ignore */ }
    });
  });
});
