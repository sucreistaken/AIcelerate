import { describe, it, expect, beforeEach, vi } from "vitest";
import { MongoRepository } from "../mongoRepository";

interface TestEntity {
  id: string;
  name: string;
  value?: number;
}

/**
 * Creates a mock Mongoose Model with the methods used by MongoRepository.
 * Each method returns chainable objects where needed (e.g., .lean()).
 */
function createMockModel() {
  const store = new Map<string, any>();

  const toDoc = (obj: any) => {
    const { id, ...rest } = obj;
    return { _id: id, __v: 0, ...rest };
  };

  const lean = (result: any) => ({
    lean: () => Promise.resolve(result),
  });

  const model: any = {
    find: vi.fn().mockImplementation(() => ({
      lean: () => {
        const docs = Array.from(store.values()).map((v) => toDoc(v));
        return Promise.resolve(docs);
      },
    })),

    findById: vi.fn().mockImplementation((id: string) =>
      lean(store.has(id) ? toDoc(store.get(id)) : null)
    ),

    create: vi.fn().mockImplementation((data: any) => {
      const { _id, ...rest } = data;
      const entity = { id: _id, ...rest };
      store.set(_id, entity);
      return Promise.resolve({
        toObject: () => toDoc(entity),
      });
    }),

    findByIdAndUpdate: vi.fn().mockImplementation(
      (id: string, update: any, options: any) => {
        const setData = update.$set || {};
        if (options?.upsert) {
          const existing = store.get(id) || { id };
          const merged = { ...existing, ...setData, id };
          store.set(id, merged);
          return lean(toDoc(merged));
        }
        if (!store.has(id)) return lean(null);
        const existing = store.get(id);
        const merged = { ...existing, ...setData, id };
        store.set(id, merged);
        return lean(toDoc(merged));
      }
    ),

    findByIdAndDelete: vi.fn().mockImplementation((id: string) => {
      if (!store.has(id)) return Promise.resolve(null);
      const item = store.get(id);
      store.delete(id);
      return Promise.resolve(item);
    }),

    countDocuments: vi.fn().mockImplementation(() => Promise.resolve(store.size)),

    // Expose store for test assertions
    _store: store,
  };

  return model;
}

describe("MongoRepository", () => {
  let mockModel: ReturnType<typeof createMockModel>;
  let repo: MongoRepository<TestEntity>;

  beforeEach(() => {
    mockModel = createMockModel();
    repo = new MongoRepository<TestEntity>(mockModel);
  });

  describe("findAll", () => {
    it("returns empty array when no documents exist", async () => {
      const items = await repo.findAll();
      expect(items).toEqual([]);
      expect(mockModel.find).toHaveBeenCalled();
    });

    it("returns all items with id mapped from _id", async () => {
      await repo.create({ id: "a", name: "Alpha" });
      await repo.create({ id: "b", name: "Beta" });
      const items = await repo.findAll();
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveProperty("id");
      expect(items[0]).not.toHaveProperty("_id");
      expect(items[0]).not.toHaveProperty("__v");
    });
  });

  describe("findById", () => {
    it("returns null when item does not exist", async () => {
      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
      expect(mockModel.findById).toHaveBeenCalledWith("nonexistent");
    });

    it("returns the correct item by id", async () => {
      await repo.create({ id: "x1", name: "Entity X" });
      const result = await repo.findById("x1");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("x1");
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
    it("creates and returns the item with correct id", async () => {
      const item = await repo.create({ id: "c1", name: "Created" });
      expect(item.id).toBe("c1");
      expect(item.name).toBe("Created");
      expect(mockModel.create).toHaveBeenCalled();
    });

    it("passes _id to Mongoose model", async () => {
      await repo.create({ id: "c2", name: "Test" });
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ _id: "c2", name: "Test" })
      );
    });
  });

  describe("update", () => {
    it("updates an existing item and returns it", async () => {
      await repo.create({ id: "u1", name: "Old", value: 1 });
      const updated = await repo.update("u1", { name: "New" });
      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("New");
      expect(updated!.value).toBe(1);
    });

    it("returns null for non-existent id", async () => {
      const result = await repo.update("missing", { name: "X" });
      expect(result).toBeNull();
    });

    it("does not include id in $set payload", async () => {
      await repo.create({ id: "u2", name: "Test" });
      await repo.update("u2", { id: "hacked", name: "Hacked" } as any);
      // Verify that findByIdAndUpdate was called without id in $set
      const calls = mockModel.findByIdAndUpdate.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].$set).not.toHaveProperty("id");
    });
  });

  describe("delete", () => {
    it("removes the item and returns true", async () => {
      await repo.create({ id: "d1", name: "ToDelete" });
      const result = await repo.delete("d1");
      expect(result).toBe(true);
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith("d1");
    });

    it("returns false for non-existent id", async () => {
      const result = await repo.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("count", () => {
    it("returns 0 for empty collection", async () => {
      expect(await repo.count()).toBe(0);
    });

    it("returns correct count after creates", async () => {
      await repo.create({ id: "1", name: "A" });
      await repo.create({ id: "2", name: "B" });
      expect(await repo.count()).toBe(2);
    });
  });

  describe("upsert", () => {
    it("inserts a new item when id does not exist", async () => {
      const item = await repo.upsert({ id: "up1", name: "Upserted" });
      expect(item.name).toBe("Upserted");
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "up1",
        expect.objectContaining({ $set: expect.objectContaining({ name: "Upserted" }) }),
        expect.objectContaining({ upsert: true, new: true })
      );
    });

    it("replaces an existing item when id matches", async () => {
      await repo.create({ id: "up2", name: "Original", value: 5 });
      const item = await repo.upsert({ id: "up2", name: "Replaced", value: 10 });
      expect(item.name).toBe("Replaced");
      expect(item.value).toBe(10);
    });
  });

  describe("id mapping", () => {
    it("strips _id and __v from returned entities", async () => {
      await repo.create({ id: "map1", name: "Test" });
      const item = await repo.findById("map1");
      expect(item).not.toBeNull();
      expect(item).toHaveProperty("id", "map1");
      expect(item).not.toHaveProperty("_id");
      expect(item).not.toHaveProperty("__v");
    });
  });
});
