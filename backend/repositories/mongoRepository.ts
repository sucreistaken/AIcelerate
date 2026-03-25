import type { Model } from "mongoose";
import type { IRepository } from "./IRepository";

/**
 * MongoDB-backed implementation of IRepository.
 * Uses lean queries for performance (returns plain objects, not Mongoose documents).
 * Handles _id <-> id mapping transparently.
 */
export class MongoRepository<T extends { id: string }> implements IRepository<T> {
  constructor(private model: Model<any>) {}

  /** Map a Mongoose lean doc (_id, __v) to a plain T with `id`. */
  private toEntity(doc: any): T {
    if (!doc) return doc;
    const { _id, __v, ...rest } = doc;
    return { ...rest, id: String(_id) } as unknown as T;
  }

  async findAll(): Promise<T[]> {
    const docs = await this.model.find().lean();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<T | null> {
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findBy(predicate: (item: T) => boolean): Promise<T[]> {
    // Mongoose has no predicate-based query, so we fetch all and filter in memory.
    const all = await this.findAll();
    return all.filter(predicate);
  }

  async findOneBy(predicate: (item: T) => boolean): Promise<T | null> {
    const all = await this.findAll();
    return all.find(predicate) ?? null;
  }

  async create(item: T): Promise<T> {
    const { id, ...rest } = item as any;
    const doc = await this.model.create({ _id: id, ...rest });
    return this.toEntity(doc.toObject());
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const { id: _ignoredId, ...rest } = updates as any;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: rest }, { new: true })
      .lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }

  async count(): Promise<number> {
    return this.model.countDocuments();
  }

  async upsert(item: T): Promise<T> {
    const { id, ...rest } = item as any;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: rest }, { new: true, upsert: true })
      .lean();
    return this.toEntity(doc);
  }
}
