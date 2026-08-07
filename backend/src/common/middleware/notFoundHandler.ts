import type { Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode } from "../constants/errorCodes.js";

/** Registered after all routes, before errorHandler — catches unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(HttpStatus.NOT_FOUND).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    code: ErrorCode.RECORD_NOT_FOUND,
  });
}
