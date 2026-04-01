import { Request, Response, NextFunction } from "express";
import { logger, type Logger } from "../utils/logger";
import { uid } from "../utils/idGenerator";

// Extend Express Request with logging context
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

/**
 * Middleware that attaches a unique requestId and child logger to each request.
 * The child logger includes requestId, userId (if authenticated), method, and path.
 */
export function requestContext(req: Request, _res: Response, next: NextFunction) {
  const requestId = (req.headers["x-request-id"] as string) || uid();
  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    userId: (req as any).user?.userId,
    method: req.method,
    path: req.originalUrl,
  });
  next();
}
