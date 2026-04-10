import mongoose from "mongoose";
import { logger } from "../utils/logger";

const SLOW_QUERY_THRESHOLD_MS = 100;

/**
 * Mongoose plugin that logs queries taking longer than the threshold.
 * Register BEFORE model compilation (e.g., in database.ts after connect).
 */
export function registerQueryMonitor(): void {
  mongoose.plugin((schema: mongoose.Schema) => {
    schema.pre("find", function () {
      (this as any)._queryStartTime = Date.now();
    });

    schema.post("find", function () {
      const start = (this as any)._queryStartTime;
      if (!start) return;
      const durationMs = Date.now() - start;
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(
          { op: "find", durationMs, collection: (this as any).mongooseCollection?.name || "unknown" },
          "Slow query detected",
        );
      }
    });

    schema.pre("findOne", function () {
      (this as any)._queryStartTime = Date.now();
    });

    schema.post("findOne", function () {
      const start = (this as any)._queryStartTime;
      if (!start) return;
      const durationMs = Date.now() - start;
      if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn(
          { op: "findOne", durationMs, collection: (this as any).mongooseCollection?.name || "unknown" },
          "Slow query detected",
        );
      }
    });
  });
}
