import { Request, Response, NextFunction } from "express";
import { logger, type Logger } from "../utils/logger";
import { uid } from "../utils/idGenerator";

// Extend Express Request with logging context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
  const requestId = uid();
  req.requestId = requestId;
  req.log = logger.child({
    requestId,
    userId: (req as unknown as { user?: { userId: string } }).user?.userId,
    method: req.method,
    path: req.originalUrl,
  });
  next();
}
