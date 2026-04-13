import mongoose from "mongoose";
import { logger } from "../utils/logger";

const SLOW_QUERY_THRESHOLD_MS = 100;
const SAMPLE_RATE = 0.1; // Only monitor 10% of queries

// Mongoose query hooks expose `this` as Query, but there's no built-in way to
// attach custom timing metadata. We use a WeakMap to avoid polluting the query object.
const queryTimings = new WeakMap<object, number>();

export function registerQueryMonitor(): void {
  mongoose.plugin((schema: mongoose.Schema) => {
    schema.pre("find", function () {
      if (Math.random() < SAMPLE_RATE) {
        queryTimings.set(this, Date.now());
      }
    });

    schema.post("find", function () {
      const start = queryTimings.get(this);
      if (!start) return;
      queryTimings.delete(this);
      const durationMs = Date.now() - start;
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(
          { op: "find", durationMs, collection: this.model?.collection?.name || "unknown" },
          "Slow query detected",
        );
      }
    });

    schema.pre("findOne", function () {
      if (Math.random() < SAMPLE_RATE) {
        queryTimings.set(this, Date.now());
      }
    });

    schema.post("findOne", function () {
      const start = queryTimings.get(this);
      if (!start) return;
      queryTimings.delete(this);
      const durationMs = Date.now() - start;
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(
          { op: "findOne", durationMs, collection: this.model?.collection?.name || "unknown" },
          "Slow query detected",
        );
      }
    });
  });
}
