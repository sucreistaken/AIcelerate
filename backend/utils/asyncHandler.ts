import { Request, Response, NextFunction } from "express";

/**
 * Wraps an async route handler so thrown errors are forwarded to Express error middleware.
 * Supports generic request types (e.g., AuthRequest) for type-safe handlers.
 */
export const asyncHandler = <Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as Req, res, next)).catch(next);
};
