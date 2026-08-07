import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route/controller handler so a rejected promise is forwarded
 * to Express's error-handling middleware instead of becoming an unhandled
 * rejection. Every controller method should be wrapped with this.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
