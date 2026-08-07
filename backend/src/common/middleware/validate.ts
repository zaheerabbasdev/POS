import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ValidationError } from "../errors/AppError.js";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Request validation middleware (SAD Chapter 18 — Request Lifecycle: runs
 * after auth/authorization, before the controller). Parses with Zod and
 * writes the coerced/defaulted values back onto the request.
 *
 * `req.query` is a live getter in Express 5 (re-derived from the URL on
 * every access), so the coerced query is stashed on `req.validatedQuery`
 * instead of being written back to `req.query` — read from there, not
 * `req.query`, downstream.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.validatedQuery = schemas.query.parse(req.query) as Record<string, unknown>;
      }
      if (schemas.params) {
        const parsed = schemas.params.parse(req.params) as Record<string, unknown>;
        Object.assign(req.params, parsed);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        next(new ValidationError("Validation failed.", details));
        return;
      }
      next(err);
    }
  };
}
