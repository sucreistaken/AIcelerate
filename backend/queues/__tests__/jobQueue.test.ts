import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Mock JobModel ────────────────────────────────────────────────────
const mockCreate = vi.fn();
const mockFind = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockDeleteMany = vi.fn();

// Chainable query helpers
function chainable(result: any) {
  const chain: any = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

vi.mock("../../models/Job", () => ({
  Job: {
    create: (...args: any[]) => mockCreate(...args),
    find: (...args: any[]) => {
      const result = mockFind(...args);
      return result;
    },
    findById: (...args: any[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: any[]) => mockFindByIdAndUpdate(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args),
    updateMany: (...args: any[]) => mockUpdateMany(...args),
    deleteMany: (...args: any[]) => mockDeleteMany(...args),
  },
}));

import { jobQueue } from "../jobQueue";

// ── Helpers ──────────────────────────────────────────────────────────

function makeJobDoc(overrides: Record<string, any> = {}) {
  return {
    _id: { toString: () => overrides.id || "job-1" },
    type: overrides.type || "test:job",
    payload: overrides.payload || { foo: "bar" },
    status: overrides.status || "pending",
    result: overrides.result,
    error: overrides.error,
    attempts: overrides.attempts ?? 0,
    maxAttempts: overrides.maxAttempts ?? 3,
    createdAt: overrides.createdAt || new Date("2025-01-01"),
    processedAt: overrides.processedAt,
  };
}

describe("MongoJobQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── add ───────────────────────────────────────────────────────────

  describe("add()", () => {
    it("creates a job with pending status", async () => {
      const doc = makeJobDoc({ status: "pending" });
      mockCreate.mockResolvedValue(doc);

      const job = await jobQueue.add("test:job", { foo: "bar" });

      expect(mockCreate).toHaveBeenCalledWith({
        type: "test:job",
        payload: { foo: "bar" },
        maxAttempts: 3,
      });
      expect(job.id).toBe("job-1");
      expect(job.type).toBe("test:job");
      expect(job.status).toBe("pending");
      expect(job.payload).toEqual({ foo: "bar" });
    });

    it("passes custom maxAttempts", async () => {
      const doc = makeJobDoc({ maxAttempts: 5 });
      mockCreate.mockResolvedValue(doc);

      await jobQueue.add("test:job", {}, 5);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ maxAttempts: 5 }),
      );
    });
  });

  // ── getPending ────────────────────────────────────────────────────

  describe("getPending()", () => {
    it("returns only pending jobs sorted by createdAt", async () => {
      const docs = [
        makeJobDoc({ id: "j1" }),
        makeJobDoc({ id: "j2" }),
      ];
      const chain = chainable(docs);
      mockFind.mockReturnValue(chain);

      const jobs = await jobQueue.getPending();

      expect(mockFind).toHaveBeenCalledWith({ status: "pending" });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(chain.limit).toHaveBeenCalledWith(10);
      expect(jobs).toHaveLength(2);
      expect(jobs[0].id).toBe("j1");
      expect(jobs[1].id).toBe("j2");
    });

    it("respects the limit parameter", async () => {
      const chain = chainable([makeJobDoc()]);
      mockFind.mockReturnValue(chain);

      await jobQueue.getPending(3);

      expect(chain.limit).toHaveBeenCalledWith(3);
    });
  });

  // ── markProcessing ────────────────────────────────────────────────

  describe("markProcessing()", () => {
    it("changes status to processing", async () => {
      const doc = makeJobDoc({ status: "processing" });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const job = await jobQueue.markProcessing("job-1");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "job-1", status: "pending" },
        { $set: { status: "processing", processedAt: expect.any(Date) } },
        { returnDocument: 'after' },
      );
      expect(job).not.toBeNull();
      expect(job!.status).toBe("processing");
    });

    it("returns null if job not in pending state (race condition)", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);

      const job = await jobQueue.markProcessing("job-1");

      expect(job).toBeNull();
    });
  });

  // ── markCompleted ─────────────────────────────────────────────────

  describe("markCompleted()", () => {
    it("changes status to completed with result", async () => {
      const doc = makeJobDoc({ status: "completed", result: { ok: true } });
      mockFindByIdAndUpdate.mockResolvedValue(doc);

      const job = await jobQueue.markCompleted("job-1", { ok: true });

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "job-1",
        { $set: { status: "completed", result: { ok: true } } },
        { returnDocument: 'after' },
      );
      expect(job!.status).toBe("completed");
      expect(job!.result).toEqual({ ok: true });
    });

    it("returns null if job not found", async () => {
      mockFindByIdAndUpdate.mockResolvedValue(null);
      const job = await jobQueue.markCompleted("nonexistent");
      expect(job).toBeNull();
    });
  });

  // ── markFailed ────────────────────────────────────────────────────

  describe("markFailed()", () => {
    it("increments attempts and keeps pending when under maxAttempts", async () => {
      // Single atomic pipeline: attempts 1→2, status→pending (2 < maxAttempts 3)
      const resultDoc = makeJobDoc({ status: "pending", attempts: 2, maxAttempts: 3, error: "oops" });
      mockFindByIdAndUpdate.mockResolvedValue(resultDoc);

      const job = await jobQueue.markFailed("job-1", "oops");

      // Single call with aggregation pipeline
      expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        "job-1",
        expect.arrayContaining([
          expect.objectContaining({ $set: expect.objectContaining({ error: "oops" }) }),
        ]),
        { returnDocument: 'after' },
      );
      expect(job!.status).toBe("pending");
    });

    it("moves to dead status when attempts reach maxAttempts", async () => {
      // Single atomic pipeline: attempts 2→3, status→dead (3 >= maxAttempts 3)
      const resultDoc = makeJobDoc({ status: "dead", attempts: 3, maxAttempts: 3, error: "fatal" });
      mockFindByIdAndUpdate.mockResolvedValue(resultDoc);

      const job = await jobQueue.markFailed("job-1", "fatal");

      expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(job!.status).toBe("dead");
    });

    it("returns null if job not found", async () => {
      mockFindByIdAndUpdate.mockResolvedValueOnce(null);

      const job = await jobQueue.markFailed("nonexistent", "err");

      expect(job).toBeNull();
    });
  });

  // ── recoverStuckJobs ──────────────────────────────────────────────

  describe("recoverStuckJobs()", () => {
    it("resets old processing jobs to pending", async () => {
      mockUpdateMany
        .mockResolvedValueOnce({ modifiedCount: 3 })  // recover under-limit
        .mockResolvedValueOnce({ modifiedCount: 0 }); // dead-letter over-limit

      const count = await jobQueue.recoverStuckJobs(300_000);

      expect(mockUpdateMany).toHaveBeenNthCalledWith(1,
        {
          status: "processing",
          processedAt: { $lt: expect.any(Date) },
          $expr: { $lt: ["$attempts", "$maxAttempts"] },
        },
        { $set: { status: "pending" }, $inc: { attempts: 1 } },
      );
      expect(count).toBe(3);
    });

    it("uses default timeout of 5 minutes", async () => {
      mockUpdateMany
        .mockResolvedValueOnce({ modifiedCount: 0 })
        .mockResolvedValueOnce({ modifiedCount: 0 });

      await jobQueue.recoverStuckJobs();

      // Verify the cutoff date is approximately 5 minutes ago
      const call = mockUpdateMany.mock.calls[0];
      const cutoff: Date = call[0].processedAt.$lt;
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(fiveMinAgo - 100);
      expect(cutoff.getTime()).toBeLessThanOrEqual(fiveMinAgo + 100);
    });
  });

  // ── cleanup ───────────────────────────────────────────────────────

  describe("cleanup()", () => {
    it("removes old completed and dead jobs", async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 5 });

      const count = await jobQueue.cleanup();

      expect(mockDeleteMany).toHaveBeenCalledWith({
        status: { $in: ["completed", "dead"] },
        updatedAt: { $lt: expect.any(Date) },
      });
      expect(count).toBe(5);
    });

    it("accepts custom olderThanMs", async () => {
      mockDeleteMany.mockResolvedValue({ deletedCount: 1 });

      await jobQueue.cleanup(24 * 60 * 60 * 1000); // 1 day

      const call = mockDeleteMany.mock.calls[0];
      const cutoff: Date = call[0].updatedAt.$lt;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      expect(cutoff.getTime()).toBeGreaterThanOrEqual(oneDayAgo - 100);
      expect(cutoff.getTime()).toBeLessThanOrEqual(oneDayAgo + 100);
    });
  });

  // ── getDeadLetterJobs ─────────────────────────────────────────────

  describe("getDeadLetterJobs()", () => {
    it("returns dead jobs sorted by updatedAt descending", async () => {
      const docs = [makeJobDoc({ id: "d1", status: "dead" })];
      const chain = chainable(docs);
      mockFind.mockReturnValue(chain);

      const jobs = await jobQueue.getDeadLetterJobs();

      expect(mockFind).toHaveBeenCalledWith({ status: "dead" });
      expect(chain.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(chain.limit).toHaveBeenCalledWith(50);
      expect(jobs).toHaveLength(1);
    });
  });

  // ── retryDeadJob ──────────────────────────────────────────────────

  describe("retryDeadJob()", () => {
    it("resets dead job to pending with zero attempts", async () => {
      const doc = makeJobDoc({ status: "pending", attempts: 0 });
      mockFindOneAndUpdate.mockResolvedValue(doc);

      const job = await jobQueue.retryDeadJob("job-1");

      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: "job-1", status: "dead" },
        { $set: { status: "pending", attempts: 0 } },
        { returnDocument: 'after' },
      );
      expect(job!.status).toBe("pending");
      expect(job!.attempts).toBe(0);
    });

    it("returns null if job is not in dead state", async () => {
      mockFindOneAndUpdate.mockResolvedValue(null);
      const job = await jobQueue.retryDeadJob("job-1");
      expect(job).toBeNull();
    });
  });
});
