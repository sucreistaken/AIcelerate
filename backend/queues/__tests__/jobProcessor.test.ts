import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Mock jobQueue ────────────────────────────────────────────────────
const mockGetPending = vi.fn();
const mockMarkProcessing = vi.fn();
const mockMarkCompleted = vi.fn();
const mockMarkFailed = vi.fn();
const mockRecoverStuckJobs = vi.fn();

vi.mock("../jobQueue", () => ({
  jobQueue: {
    getPending: (...args: any[]) => mockGetPending(...args),
    markProcessing: (...args: any[]) => mockMarkProcessing(...args),
    markCompleted: (...args: any[]) => mockMarkCompleted(...args),
    markFailed: (...args: any[]) => mockMarkFailed(...args),
    recoverStuckJobs: (...args: any[]) => mockRecoverStuckJobs(...args),
  },
}));

import {
  registerJobHandler,
  startJobProcessor,
  stopJobProcessor,
} from "../jobProcessor";

describe("JobProcessor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockRecoverStuckJobs.mockResolvedValue(0);
    // Ensure processor is stopped between tests
    stopJobProcessor();
  });

  afterEach(() => {
    stopJobProcessor();
    vi.useRealTimers();
  });

  // ── registerJobHandler ────────────────────────────────────────────

  it("registerJobHandler() stores handler for later use", async () => {
    const handler = vi.fn().mockResolvedValue({ done: true });
    registerJobHandler("email:send", handler);

    const job = { id: "j1", type: "email:send", payload: { to: "x@y.com" } };
    mockGetPending.mockResolvedValue([job]);
    mockMarkProcessing.mockResolvedValue(job);
    mockMarkCompleted.mockResolvedValue(job);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(handler).toHaveBeenCalledWith({ to: "x@y.com" });
  });

  // ── startJobProcessor / stopJobProcessor ──────────────────────────

  it("startJobProcessor() starts polling interval", async () => {
    mockGetPending.mockResolvedValue([]);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockGetPending).toHaveBeenCalled();
  });

  it("startJobProcessor() is idempotent (second call is no-op)", async () => {
    mockGetPending.mockResolvedValue([]);

    startJobProcessor(1000);
    startJobProcessor(1000); // should not create a second interval

    await vi.advanceTimersByTimeAsync(1000);

    // Should have been called from only one interval tick
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });

  it("stopJobProcessor() clears interval so no more polling", async () => {
    mockGetPending.mockResolvedValue([]);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockGetPending).toHaveBeenCalledTimes(1);

    stopJobProcessor();

    await vi.advanceTimersByTimeAsync(5000);
    // No additional calls after stop
    expect(mockGetPending).toHaveBeenCalledTimes(1);
  });

  // ── processing pending jobs ───────────────────────────────────────

  it("processes pending jobs using registered handler", async () => {
    const handler = vi.fn().mockResolvedValue("result");
    registerJobHandler("task:run", handler);

    const job = { id: "j1", type: "task:run", payload: { data: 42 } };
    mockGetPending.mockResolvedValueOnce([job]);
    mockMarkProcessing.mockResolvedValue(job);
    mockMarkCompleted.mockResolvedValue(job);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(handler).toHaveBeenCalledWith({ data: 42 });
    expect(mockMarkProcessing).toHaveBeenCalledWith("j1");
    expect(mockMarkCompleted).toHaveBeenCalledWith("j1", "result");
  });

  // ── error handling ────────────────────────────────────────────────

  it("handles handler errors gracefully (marks job as failed)", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("handler crash"));
    registerJobHandler("task:fail", handler);

    const job = { id: "j1", type: "task:fail", payload: {} };
    mockGetPending.mockResolvedValueOnce([job]);
    mockMarkProcessing.mockResolvedValue(job);
    mockMarkFailed.mockResolvedValue(job);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockMarkFailed).toHaveBeenCalledWith("j1", "handler crash");
    expect(mockMarkCompleted).not.toHaveBeenCalled();
  });

  // ── no handler registered ─────────────────────────────────────────

  it("marks job as failed if no handler registered for type", async () => {
    // Don't register any handler for "unknown:type"
    const job = { id: "j1", type: "unknown:type", payload: {} };
    mockGetPending.mockResolvedValueOnce([job]);
    mockMarkFailed.mockResolvedValue(job);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockMarkFailed).toHaveBeenCalledWith(
      "j1",
      "No handler for job type: unknown:type",
    );
    expect(mockMarkProcessing).not.toHaveBeenCalled();
  });

  // ── markProcessing returns null (claimed by another worker) ───────

  it("skips job if markProcessing returns null (claimed by another worker)", async () => {
    const handler = vi.fn().mockResolvedValue("result");
    registerJobHandler("task:race", handler);

    const job = { id: "j1", type: "task:race", payload: {} };
    mockGetPending.mockResolvedValueOnce([job]);
    mockMarkProcessing.mockResolvedValue(null); // already claimed

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(handler).not.toHaveBeenCalled();
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  // ── multiple jobs in batch ────────────────────────────────────────

  it("processes multiple jobs in a single batch", async () => {
    const handler = vi.fn().mockResolvedValue("ok");
    registerJobHandler("batch:job", handler);

    const jobs = [
      { id: "j1", type: "batch:job", payload: { n: 1 } },
      { id: "j2", type: "batch:job", payload: { n: 2 } },
    ];
    mockGetPending.mockResolvedValueOnce(jobs);
    mockMarkProcessing.mockImplementation(async (id: string) =>
      jobs.find((j) => j.id === id) || null,
    );
    mockMarkCompleted.mockResolvedValue({});

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(mockMarkCompleted).toHaveBeenCalledTimes(2);
  });

  // ── empty queue ───────────────────────────────────────────────────

  it("does nothing when queue is empty", async () => {
    mockGetPending.mockResolvedValue([]);

    startJobProcessor(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockMarkProcessing).not.toHaveBeenCalled();
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });
});
