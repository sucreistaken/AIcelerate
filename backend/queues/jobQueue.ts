import { Job as JobModel, IJob } from "../models/Job";
import { logger } from "../utils/logger";

export interface Job {
  id: string;
  type: string;
  payload: any;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt?: string;
}

function toJob(doc: IJob): Job {
  return {
    id: doc._id.toString(),
    type: doc.type,
    payload: doc.payload,
    status: doc.status,
    result: doc.result,
    error: doc.error,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts,
    createdAt: (doc as any).createdAt?.toISOString?.() || new Date().toISOString(),
    processedAt: doc.processedAt?.toISOString(),
  };
}

class MongoJobQueue {
  async add(type: string, payload: any, maxAttempts = 3): Promise<Job> {
    const doc = await JobModel.create({ type, payload, maxAttempts });
    return toJob(doc);
  }

  async getPending(): Promise<Job[]> {
    const docs = await JobModel.find({ status: "pending" }).sort({ createdAt: 1 }).limit(10).lean();
    return docs.map((d) => toJob(d as any));
  }

  async markProcessing(id: string): Promise<Job | null> {
    const doc = await JobModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: "processing", processedAt: new Date() } },
      { new: true },
    );
    return doc ? toJob(doc) : null;
  }

  async markCompleted(id: string, result?: any): Promise<Job | null> {
    const doc = await JobModel.findByIdAndUpdate(id, { $set: { status: "completed", result } }, { new: true });
    return doc ? toJob(doc) : null;
  }

  async markFailed(id: string, error: string): Promise<Job | null> {
    const doc = await JobModel.findById(id);
    if (!doc) return null;

    const attempts = doc.attempts + 1;
    // Dead-letter: move to "dead" after maxAttempts
    const status = attempts >= doc.maxAttempts ? "dead" : "pending";
    if (status === "dead") {
      logger.warn({ jobId: id, type: doc.type, attempts }, "Job moved to dead-letter queue");
    }
    const updated = await JobModel.findByIdAndUpdate(
      id,
      { $set: { status, error, attempts } },
      { new: true },
    );
    return updated ? toJob(updated) : null;
  }

  async getDeadLetterJobs(): Promise<Job[]> {
    const docs = await JobModel.find({ status: "dead" }).sort({ updatedAt: -1 }).limit(50).lean();
    return docs.map((d) => toJob(d as any));
  }

  async retryDeadJob(id: string): Promise<Job | null> {
    const doc = await JobModel.findOneAndUpdate(
      { _id: id, status: "dead" },
      { $set: { status: "pending", attempts: 0 } },
      { new: true },
    );
    return doc ? toJob(doc) : null;
  }

  async cleanup(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await JobModel.deleteMany({
      status: { $in: ["completed"] },
      updatedAt: { $lt: cutoff },
    });
    return result.deletedCount;
  }
}

export const jobQueue = new MongoJobQueue();
