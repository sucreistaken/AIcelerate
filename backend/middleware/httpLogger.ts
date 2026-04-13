import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { logger } from "../utils/logger";

/**
 * Structured HTTP request/response logger.
 * Logs method, path, status, duration, and authenticated userId.
 * Skips health-check endpoints to reduce noise.
 */
export function httpLogger(req: AuthRequest, res: Response, next: NextFunction) {
  // Skip health check noise
  if (req.path === "/health" || req.path === "/api/health") {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const statusCode = res.statusCode;
    const userId = req.user?.userId;

    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      contentLength: res.getHeader("content-length"),
      ...(userId && { userId }),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };

    if (statusCode >= 500) {
      logger.error(logData, `${req.method} ${req.originalUrl} ${statusCode}`);
    } else if (statusCode >= 400) {
      logger.warn(logData, `${req.method} ${req.originalUrl} ${statusCode}`);
    } else {
      logger.info(logData, `${req.method} ${req.originalUrl} ${statusCode}`);
    }
  });

  next();
}
