/**
 * Generic repository interface.
 * MongoRepository is the sole implementation — all repos are MongoDB-backed.
 */
export interface IRepository<T extends { id: string }> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findBy(predicateOrFilter: ((item: T) => boolean) | Record<string, unknown>): Promise<T[]>;
  findOneBy(predicateOrFilter: ((item: T) => boolean) | Record<string, unknown>): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  upsert(item: T): Promise<T>;
}
