import type { Model } from "mongoose";
import type { IRepository } from "./IRepository";
import { BaseRepository } from "./baseRepository";
import { MongoRepository } from "./mongoRepository";

/**
 * Returns the appropriate IRepository implementation based on the
 * USE_MONGODB environment variable.
 *
 * @param jsonFilePath  Path to the JSON file (used when file-based storage is active)
 * @param mongooseModel Mongoose model (used when MongoDB storage is active)
 * @param defaultData   Default data for file-based repos (optional)
 */
export function createRepository<T extends { id: string }>(
  jsonFilePath: string,
  mongooseModel: Model<any>,
  defaultData: T[] = []
): IRepository<T> {
  const useMongo = process.env.USE_MONGODB === "true";

  if (useMongo) {
    return new MongoRepository<T>(mongooseModel);
  }

  return new BaseRepository<T>(jsonFilePath, defaultData);
}
