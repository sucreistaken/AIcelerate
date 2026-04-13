import mongoose from "mongoose";

/**
 * Global Mongoose plugin: standardizes _id → id in all JSON/lean output.
 * Applied once at startup — no per-model boilerplate needed.
 */
export function registerGlobalPlugins() {
  mongoose.plugin((schema: mongoose.Schema) => {
    const toJsonTransform = (_doc: unknown, ret: Record<string, unknown>) => {
      if (ret._id) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      delete ret.__v;
      return ret;
    };

    // toJSON transform: _id → id, remove __v
    const existingToJSON = schema.get("toJSON") || {};
    (schema as mongoose.Schema<unknown>).set("toJSON", {
      virtuals: true,
      ...(existingToJSON as Record<string, unknown>),
      transform: toJsonTransform,
    });

    // toObject transform: same as toJSON
    const existingToObject = schema.get("toObject") || {};
    (schema as mongoose.Schema<unknown>).set("toObject", {
      virtuals: true,
      ...(existingToObject as Record<string, unknown>),
      transform: toJsonTransform,
    });
  });
}

/**
 * Utility: normalize lean() results by converting _id to id.
 * Use after .lean() queries for consistent output.
 */
export function leanToId<T extends { _id?: unknown; id?: string }>(doc: T): T & { id: string } {
  if (!doc) return doc as T & { id: string };
  const result: Record<string, unknown> = { ...doc, id: String(doc._id || doc.id || "") };
  delete result._id;
  delete result.__v;
  return result as T & { id: string };
}

/**
 * Utility: normalize an array of lean() results.
 */
export function leanArrayToId<T extends { _id?: unknown; id?: string }>(docs: T[]): (T & { id: string })[] {
  return docs.map(leanToId);
}
