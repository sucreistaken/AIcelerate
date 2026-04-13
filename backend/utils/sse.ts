import { Response } from "express";

/**
 * Sets up an SSE (Server-Sent Events) response with proper headers.
 * Returns a send function and abort tracking.
 */
export function setupSSE(res: Response): {
  send: (data: Record<string, unknown>) => void;
  isAborted: () => boolean;
} {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let aborted = false;
  res.on("close", () => { aborted = true; });

  const send = (data: Record<string, unknown>) => {
    if (aborted) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      aborted = true;
    }
  };

  return { send, isAborted: () => aborted };
}
