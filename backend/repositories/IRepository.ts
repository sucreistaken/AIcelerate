/**
 * Generic repository interface.
 * Both file-based (BaseRepository) and MongoDB (MongoRepository) implementations
 * conform to this contract, allowing transparent storage-backend swapping.
 */
export interface IRepository<T extends { id: string }> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findBy(predicate: (item: T) => boolean): Promise<T[]>;
  findOneBy(predicate: (item: T) => boolean): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
  upsert(item: T): Promise<T>;
}
