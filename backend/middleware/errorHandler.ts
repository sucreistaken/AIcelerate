import { logger } from "../utils/logger";
import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Shape produced by the validate() middleware on Zod failures. */
interface ValidationError extends Error {
  statusCode: number;
  code: "VALIDATION_ERROR";
  details: Array<{ path: string; message: string }>;
}

function isValidationError(err: Error): err is ValidationError {
  return "statusCode" in err && (err as Record<string, unknown>).code === "VALIDATION_ERROR";
}

/** Shape produced by lessonAiService when LLM JSON parsing fails. */
interface LlmParseError extends Error {
  llmText: string;
}

function isLlmParseError(err: Error): err is LlmParseError {
  return "llmText" in err;
}

export function notFound(msg = "Not found") {
  return new AppError(404, msg, "NOT_FOUND");
}

export function badRequest(msg = "Bad request") {
  return new AppError(400, msg, "BAD_REQUEST");
}

export function forbidden(msg = "Forbidden") {
  return new AppError(403, msg, "FORBIDDEN");
}

export function conflict(msg = "Conflict") {
  return new AppError(409, msg, "CONFLICT");
}

export function unprocessable(msg = "Unprocessable entity") {
  return new AppError(422, msg, "UNPROCESSABLE_ENTITY");
}

export function gatewayTimeout(msg = "Gateway timeout") {
  return new AppError(504, msg, "GATEWAY_TIMEOUT");
}

export function tooManyRequests(msg = "Too many requests", retryAfterSec?: number) {
  const err = new AppError(429, msg, "RATE_LIMITED");
  if (retryAfterSec) (err as any).retryAfter = retryAfterSec;
  return err;
}

export function serviceUnavailable(msg = "Service temporarily unavailable") {
  return new AppError(503, msg, "SERVICE_UNAVAILABLE");
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  // Attach requestId for traceability
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle validation errors (from validate middleware)
  if (isValidationError(err)) {
    res.status(400).json({
      ok: false,
      error: err.message,
      code: "VALIDATION_ERROR",
      details: err.details,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle AI-specific errors
  if (err.message === "AI_TIMEOUT") {
    res.status(504).json({
      ok: false,
      error: "AI yanıt süresi aşıldı. Lütfen tekrar deneyin.",
      code: "AI_TIMEOUT",
      ...(requestId && { requestId }),
    });
    return;
  }

  if (err.message === "AI_CIRCUIT_OPEN") {
    res.status(503).json({
      ok: false,
      error: "AI servisi geçici olarak devre dışı. Lütfen biraz sonra tekrar deneyin.",
      code: "AI_CIRCUIT_OPEN",
      ...(requestId && { requestId }),
    });
    return;
  }

  if (err.message === "AI_RATE_LIMITED") {
    res.status(429).json({
      ok: false,
      error: "AI istek limiti aşıldı. Lütfen biraz bekleyin.",
      code: "AI_RATE_LIMITED",
      ...(requestId && { requestId }),
    });
    return;
  }

  if (err.message === "AI_CONTENT_FILTERED") {
    res.status(422).json({
      ok: false,
      error: "AI içerik güvenlik filtresi tarafından engellendi.",
      code: "AI_CONTENT_FILTERED",
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle Google Generative AI HTTP errors (429, 503, etc.)
  if ((err as any).status === 429 || (err.message && err.message.includes("429"))) {
    res.status(429).json({
      ok: false,
      error: "AI istek limiti aşıldı. Lütfen biraz bekleyin.",
      code: "AI_RATE_LIMITED",
      ...(requestId && { requestId }),
    });
    return;
  }

  if ((err as any).status === 503 || (err.message && err.message.includes("503"))) {
    res.status(503).json({
      ok: false,
      error: "AI servisi geçici olarak meşgul. Lütfen tekrar deneyin.",
      code: "AI_SERVICE_UNAVAILABLE",
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle JSON parse errors from LLM
  if (isLlmParseError(err)) {
    logger.error("LLM parse error:", err.message);
    res.status(500).json({
      ok: false,
      error: err.message,
      code: "LLM_PARSE_ERROR",
      llmText: err.llmText,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Log full stack for unexpected errors
  logger.error({ err, requestId, method: req.method, path: req.originalUrl }, "Unhandled error");
  res.status(500).json({
    ok: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    code: "INTERNAL_ERROR",
    ...(requestId && { requestId }),
  });
}
