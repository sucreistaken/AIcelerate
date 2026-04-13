import { logger } from "../utils/logger";
import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public isOperational = true,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

// AI-specific error subclasses — eliminates fragile string matching
export class AiTimeoutError extends AppError {
  constructor(message = "AI response timed out. Please try again.") {
    super(504, message, "AI_TIMEOUT");
    this.name = "AiTimeoutError";
  }
}

export class AiCircuitOpenError extends AppError {
  constructor(message = "AI service temporarily unavailable. Please try again later.") {
    super(503, message, "AI_CIRCUIT_OPEN");
    this.name = "AiCircuitOpenError";
  }
}

export class AiRateLimitedError extends AppError {
  constructor(message = "AI rate limit exceeded. Please wait a moment.") {
    super(429, message, "AI_RATE_LIMITED");
    this.name = "AiRateLimitedError";
  }
}

export class AiContentFilteredError extends AppError {
  constructor(message = "Content was blocked by AI safety filter.") {
    super(422, message, "AI_CONTENT_FILTERED");
    this.name = "AiContentFilteredError";
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
  if (retryAfterSec) Object.assign(err, { retryAfter: retryAfterSec });
  return err;
}

export function serviceUnavailable(msg = "Service temporarily unavailable") {
  return new AppError(503, msg, "SERVICE_UNAVAILABLE");
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  // Attach requestId for traceability (set by requestContext middleware)
  const requestId = req.requestId;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle HTTP errors from Express/body-parser (SyntaxError, PayloadTooLargeError, etc.)
  // These have statusCode + expose set by the middleware that created them.
  const httpErr = err as unknown as Record<string, unknown>;
  if (typeof httpErr.statusCode === "number" && httpErr.expose === true) {
    res.status(httpErr.statusCode as number).json({
      ok: false,
      error: err.message,
      code: httpErr.statusCode === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
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

  // Handle AI-specific errors via class hierarchy (no fragile string matching)
  if (
    err instanceof AiTimeoutError ||
    err instanceof AiCircuitOpenError ||
    err instanceof AiRateLimitedError ||
    err instanceof AiContentFilteredError
  ) {
    res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code,
      ...(requestId && { requestId }),
    });
    return;
  }

  // Handle Google Generative AI HTTP errors (429, 503, etc.)
  const errStatus = "status" in err ? (err as Record<string, unknown>).status : undefined;
  if (errStatus === 429) {
    res.status(429).json({
      ok: false,
      error: "AI rate limit exceeded. Please wait a moment.",
      code: "AI_RATE_LIMITED",
      ...(requestId && { requestId }),
    });
    return;
  }

  if (errStatus === 503) {
    res.status(503).json({
      ok: false,
      error: "AI service temporarily busy. Please try again.",
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
      ...(process.env.NODE_ENV !== "production" && { llmText: err.llmText }),
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
