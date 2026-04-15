import { Job as JobModel, IJob } from "../models/Job";
import { logger } from "../utils/logger";

export interface Job {
  id: string;
  type: string;
  payload: unknown;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt?: string;
}

function toJob(doc: IJob & { createdAt?: Date }): Job {
  return {
    id: doc._id.toString(),
    type: doc.type,
    payload: doc.payload,
    status: doc.status,
    result: doc.result,
    error: doc.error,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    processedAt: doc.processedAt?.toISOString(),
  };
}

class MongoJobQueue {
  async add(type: string, payload: Record<string, unknown>, maxAttempts = 3): Promise<Job> {
    const doc = await JobModel.create({ type, payload, maxAttempts });
    return toJob(doc);
  }

  async getPending(limit: number = 10): Promise<Job[]> {
    const docs = await JobModel.find({ status: "pending" }).sort({ createdAt: 1 }).limit(limit).lean();
    return docs.map((d) => toJob(d as IJob & { createdAt?: Date }));
  }

  async markProcessing(id: string): Promise<Job | null> {
    const doc = await JobModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "processing", processedAt: new Date() } },
      { returnDocument: 'after' },
    );
    return doc ? toJob(doc) : null;
  }

  async markCompleted(id: string, result?: unknown): Promise<Job | null> {
    const doc = await JobModel.findByIdAndUpdate(id, { $set: { status: "completed", result } }, { returnDocument: 'after' });
    return doc ? toJob(doc) : null;
  }

  async markFailed(id: string, error: string): Promise<Job | null> {
    // Single atomic aggregation pipeline: increment attempts + conditionally set status
    // No crash window — one DB round-trip, one atomic write
    // Source: MongoDB docs recommend single findOneAndUpdate over multi-step read-modify-write
    const doc = await JobModel.findByIdAndUpdate(
      id,
      [
        { $set: {
          error,
          attempts: { $add: ["$attempts", 1] },
        }},
        { $set: {
          status: {
            $cond: {
              if: { $gte: [{ $add: ["$attempts", 1] }, "$maxAttempts"] },
              then: "dead",
              else: "pending",
            },
          },
        }},
      ],
      { returnDocument: 'after' },
    );
    if (!doc) return null;

    if (doc.status === "dead") {
      logger.warn({ jobId: id, type: doc.type, attempts: doc.attempts }, "Job moved to dead-letter queue");
    }
    return toJob(doc);
  }

  async getDeadLetterJobs(): Promise<Job[]> {
    const docs = await JobModel.find({ status: "dead" }).sort({ updatedAt: -1 }).limit(50).lean();
    return docs.map((d) => toJob(d as IJob & { createdAt?: Date }));
  }

  async retryDeadJob(id: string): Promise<Job | null> {
    const doc = await JobModel.findOneAndUpdate(
      { _id: id, status: "dead" },
      { $set: { status: "pending", attempts: 0 } },
      { returnDocument: 'after' },
    );
    return doc ? toJob(doc) : null;
  }

  async recoverStuckJobs(timeoutMs: number = 5 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMs);
    // Only recover jobs that haven't exceeded maxAttempts
    // Use $expr to compare attempts < maxAttempts
    const result = await JobModel.updateMany(
      {
        status: "processing",
        processedAt: { $lt: cutoff },
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
      },
      { $set: { status: "pending" }, $inc: { attempts: 1 } }
    );

    // Dead-letter jobs that exceeded maxAttempts while stuck
    await JobModel.updateMany(
      {
        status: "processing",
        processedAt: { $lt: cutoff },
        $expr: { $gte: ["$attempts", "$maxAttempts"] },
      },
      { $set: { status: "dead" } }
    );

    return result.modifiedCount;
  }

  async cleanup(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await JobModel.deleteMany({
      status: { $in: ["completed", "dead"] },
      updatedAt: { $lt: cutoff },
    });
    return result.deletedCount;
  }
}

export const jobQueue = new MongoJobQueue();
