// src/services/sseClient.ts
// Shared SSE consumer for POST-based streaming endpoints.
//
// Why a helper:
// - All AI-streaming endpoints in this app share the same SSE frame contract
//   ("data: <json>\n\n" with {type:"chunk"|"done"|"error", ...}).
// - Duplicating the reader loop (buffer, split on \n, JSON.parse with skip-bad-frame
//   fallback) in every caller is error-prone; one tested helper keeps behaviour
//   consistent and guarantees AbortController cleanup.
//
// Callers pass an AbortController.signal (either their own or the one returned
// from consumeSseStream) to cancel on unmount. The helper surfaces transport
// failures via onError and never throws — streaming UIs prefer a status callback
// over a rejected promise.

import { getAccessToken } from "./fetchWithAuth";

export interface SseEvent {
  type: string;
  [key: string]: unknown;
}

export interface SseCallbacks {
  onEvent: (event: SseEvent) => void;
  onError: (error: string) => void;
  onClose?: () => void;
}

export interface SseRequestOptions {
  method?: "POST" | "GET";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * POSTs to `url` and consumes the SSE response stream.
 * Returns an AbortController — call .abort() to cancel the stream (also happens
 * automatically when the caller-provided signal aborts).
 */
export function consumeSseStream(
  url: string,
  options: SseRequestOptions,
  callbacks: SseCallbacks,
): AbortController {
  const controller = new AbortController();

  // Chain caller signal → controller so unmount aborts the fetch.
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        method: options.method ?? "POST",
        headers,
        credentials: "include",
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message || "Stream connection failed");
      }
      callbacks.onClose?.();
      return;
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error) errMsg = body.error;
      } catch {
        // body wasn't JSON — keep generic message
      }
      callbacks.onError(errMsg);
      callbacks.onClose?.();
      return;
    }

    if (!res.body) {
      callbacks.onError("Stream connection failed");
      callbacks.onClose?.();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as SseEvent;
            callbacks.onEvent(parsed);
          } catch {
            // Malformed SSE frame — skip rather than tear the stream down
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        callbacks.onError((err as Error).message || "Stream interrupted");
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* reader may already be released */
      }
      callbacks.onClose?.();
    }
  })();

  return controller;
}
