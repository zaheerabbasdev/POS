import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { isProduction } from "../../config/env.js";
import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode, type ErrorCodeType } from "../constants/errorCodes.js";
import { AppError } from "../errors/AppError.js";
import { logger } from "../logger/logger.js";

interface MappedError {
  statusCode: number;
  code: ErrorCodeType;
  message: string;
}

/**
 * Centralized error-handling middleware (SAD Chapter 23 — Exception
 * Handling Architecture). Must be registered last, after all routes.
 * Maps every thrown error onto the standard
 * `{ success: false, message, code, errors? }` response shape.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logIfServerError(err.statusCode, req, err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaKnownError(err);
    logIfServerError(mapped.statusCode, req, err);
    res.status(mapped.statusCode).json({ success: false, message: mapped.message, code: mapped.code });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ path: req.originalUrl, err: err.message }, "Prisma validation error");
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: "Invalid data was sent to the database layer.",
      code: ErrorCode.BAD_REQUEST,
    });
    return;
  }

  logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: isProduction || !(err instanceof Error) ? "An unexpected error occurred." : err.message,
    code: ErrorCode.SERVER_ERROR,
  });
}

function logIfServerError(statusCode: number, req: Request, err: unknown): void {
  if (statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, "Request failed");
  } else {
    logger.warn({ path: req.originalUrl, method: req.method }, err instanceof Error ? err.message : "Request failed");
  }
}

function mapPrismaKnownError(err: Prisma.PrismaClientKnownRequestError): MappedError {
  switch (err.code) {
    case "P2002": {
      const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(", ") : undefined;
      return {
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.DUPLICATE_RECORD,
        message: target ? `A record with this ${target} already exists.` : "A record with these values already exists.",
      };
    }
    case "P2003":
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.BAD_REQUEST,
        message: "Related record does not exist.",
      };
    case "P2025":
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.RECORD_NOT_FOUND,
        message: "Record not found.",
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.SERVER_ERROR,
        message: "A database error occurred.",
      };
  }
}
