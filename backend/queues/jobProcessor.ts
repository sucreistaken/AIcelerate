import { logger } from "../utils/logger";
import { jobQueue } from "./jobQueue";

type JobHandler = (payload: unknown) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers.set(type, handler);
}

let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

const BATCH_SIZE = 5;
const MIN_INTERVAL = 1000;  // 1s when busy
const MAX_INTERVAL = 10000; // 10s when idle
let currentInterval = 2000;
let cycleCount = 0;
const RECOVERY_EVERY_N_CYCLES = 10; // recover stuck jobs every ~10 cycles

async function processNext(): Promise<void> {
  if (running) return;
  running = true;

  let processed = 0;
  try {
    // Periodically recover stuck jobs
    cycleCount++;
    if (cycleCount % RECOVERY_EVERY_N_CYCLES === 0) {
      const recovered = await jobQueue.recoverStuckJobs();
      if (recovered > 0) {
        logger.info(`[JobProcessor] Recovered ${recovered} stuck job(s)`);
      }
    }

    const pending = await jobQueue.getPending(BATCH_SIZE);
    if (pending.length === 0) {
      // No work: slow down polling
      currentInterval = Math.min(currentInterval * 1.5, MAX_INTERVAL);
      return;
    }

    for (const job of pending) {
      const handler = handlers.get(job.type);
      if (!handler) {
        await jobQueue.markFailed(job.id, `No handler for job type: ${job.type}`);
        continue;
      }

      const claimed = await jobQueue.markProcessing(job.id);
      if (!claimed) continue;

      try {
        const result = await handler(job.payload);
        await jobQueue.markCompleted(job.id, result);
        processed++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await jobQueue.markFailed(job.id, message);
      }
    }

    // Work found: speed up polling
    if (processed > 0) {
      currentInterval = MIN_INTERVAL;
    }
  } finally {
    running = false;
    // Reschedule with adaptive interval
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = setInterval(processNext, currentInterval);
    }
  }
}

export function startJobProcessor(intervalMs = 2000): void {
  if (intervalId) return;
  currentInterval = intervalMs;
  intervalId = setInterval(processNext, currentInterval);
  logger.info(`[JobProcessor] Started (interval: ${intervalMs}ms)`);
}

export function stopJobProcessor(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("[JobProcessor] Stopped");
  }
}
