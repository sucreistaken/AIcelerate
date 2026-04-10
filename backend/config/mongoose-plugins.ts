import mongoose from "mongoose";

/**
 * Global Mongoose plugin: standardizes _id → id in all JSON/lean output.
 * Applied once at startup — no per-model boilerplate needed.
 */
export function registerGlobalPlugins() {
  mongoose.plugin((schema) => {
    // toJSON transform: _id → id, remove __v
    schema.set("toJSON", {
      virtuals: true,
      transform(_doc: any, ret: any) {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        delete ret.__v;
        return ret;
      },
      ...schema.get("toJSON"), // Allow per-model overrides
    });

    // toObject transform: same as toJSON
    schema.set("toObject", {
      virtuals: true,
      transform(_doc: any, ret: any) {
        if (ret._id) {
          ret.id = ret._id.toString();
          delete ret._id;
        }
        delete ret.__v;
        return ret;
      },
      ...schema.get("toObject"),
    });
  });
}

/**
 * Utility: normalize lean() results by converting _id to id.
 * Use after .lean() queries for consistent output.
 */
export function leanToId<T extends { _id?: any; id?: string }>(doc: T): T & { id: string } {
  if (!doc) return doc as any;
  const result = { ...doc, id: (doc._id || doc.id || "").toString() } as any;
  delete result._id;
  delete result.__v;
  return result;
}

/**
 * Utility: normalize an array of lean() results.
 */
export function leanArrayToId<T extends { _id?: any; id?: string }>(docs: T[]): (T & { id: string })[] {
  return docs.map(leanToId);
}
