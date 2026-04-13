import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success, replaces req.body with the parsed (and defaulted) value.
 * On failure, returns 400 with structured error details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }));
      const err = Object.assign(
        new Error(issues.map((e) => e.message).join("; ")),
        { statusCode: 400, code: "VALIDATION_ERROR", details: issues }
      );
      return next(err);
    }
    req.body = result.data;
    next();
  };
}
