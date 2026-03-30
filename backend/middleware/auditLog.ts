import { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import { auditRepo } from "../repositories/auditRepo";
import { generateId } from "../utils/idGenerator";

/** Fields to redact from logged request bodies */
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
  "apiKey",
]);

function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key) || SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Middleware factory that logs successful operations to the audit log.
 * Wraps res.json to intercept successful responses.
 * Writes are fire-and-forget (errors are swallowed).
 */
export function auditLog(action: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (data: any) {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entry = {
          id: generateId("audit"),
          userId: req.user?.userId || "anonymous",
          action,
          resource: `${req.method} ${req.originalUrl}`,
          details: sanitizeBody(req.body || {}),
          ip:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            "unknown",
          timestamp: new Date().toISOString(),
        };

        // Fire-and-forget write
        auditRepo.create(entry).catch(() => {
          // Swallow audit write errors — never break the request
        });
      }

      return originalJson(data);
    } as typeof res.json;

    next();
  };
}
