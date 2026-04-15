import type { Model } from "mongoose";
import type { IRepository } from "./IRepository";

/**
 * MongoDB-backed implementation of IRepository.
 * Uses lean queries for performance (returns plain objects, not Mongoose documents).
 * Handles _id <-> id mapping transparently.
 */
export class MongoRepository<T extends { id: string }> implements IRepository<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose Model<T> is invariant; widened to accept any Model
  constructor(protected model: Model<any>) {}

  /** Map a Mongoose lean doc (_id, __v) to a plain T with `id`. */
  protected toEntity(doc: Record<string, unknown>): T {
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

  async findBy(predicateOrFilter: ((item: T) => boolean) | Record<string, unknown>): Promise<T[]> {
    if (typeof predicateOrFilter === "function") {
      const predicate = predicateOrFilter as (item: T) => boolean;
      const all = await this.findAll();
      return all.filter(predicate);
    }
    // MongoDB filter query: push filtering to the database.
    const docs = await this.model.find(predicateOrFilter).lean();
    return docs.map((d) => this.toEntity(d as Record<string, unknown>));
  }

  async findOneBy(predicateOrFilter: ((item: T) => boolean) | Record<string, unknown>): Promise<T | null> {
    if (typeof predicateOrFilter === "function") {
      const predicate = predicateOrFilter as (item: T) => boolean;
      const all = await this.findAll();
      return all.find(predicate) ?? null;
    }
    // MongoDB filter query: single-document lookup at DB level.
    const doc = await this.model.findOne(predicateOrFilter).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async create(item: T): Promise<T> {
    // TODO: type properly — TS can't destructure+spread a generic T cleanly
    const { id, ...rest } = item as T & Record<string, unknown>;
    const doc = await this.model.create({ _id: id, ...rest });
    return this.toEntity(doc.toObject());
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    // TODO: type properly — TS can't destructure+spread Partial<T> cleanly
    const { id: _ignoredId, ...rest } = updates as Partial<T> & Record<string, unknown>;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: rest }, { returnDocument: 'after' })
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
    // TODO: type properly — TS can't destructure+spread a generic T cleanly
    const { id, ...rest } = item as T & Record<string, unknown>;
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: rest }, { returnDocument: 'after', upsert: true })
      .lean();
    return this.toEntity(doc);
  }
}
