import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode, type ErrorCodeType } from "../constants/errorCodes.js";

export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Base class for every operational error thrown intentionally by
 * controllers/services/repositories (SAD Chapter 23 — Exception Handling
 * Architecture). Caught by common/middleware/errorHandler.ts and turned
 * into the standard `{ success: false, message, code }` response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeType;
  public readonly details: ErrorDetail[] | undefined;
  public readonly isOperational = true;

  constructor(message: string, statusCode: number, code: ErrorCodeType, details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 422 — request payload failed schema validation. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed.", details?: ErrorDetail[]) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.VALIDATION_ERROR, details);
  }
}

/** 400 — well-formed request that still can't be processed (business rule violation). */
export class BadRequestError extends AppError {
  constructor(message = "Bad request.") {
    super(message, HttpStatus.BAD_REQUEST, ErrorCode.BAD_REQUEST);
  }
}

/** 401 — missing, invalid, or expired credentials. */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required.", code: ErrorCodeType = ErrorCode.AUTH_FAILED) {
    super(message, HttpStatus.UNAUTHORIZED, code);
  }
}

/** 403 — authenticated, but not permitted (RBAC denial). */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.ACCESS_DENIED);
  }
}

/** 404 — record does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, HttpStatus.NOT_FOUND, ErrorCode.RECORD_NOT_FOUND);
  }
}

/** 409 — record already exists / conflicts with current state. */
export class ConflictError extends AppError {
  constructor(message = "Record already exists.") {
    super(message, HttpStatus.CONFLICT, ErrorCode.DUPLICATE_RECORD);
  }
}

/** 500 — thrown deliberately for known-but-unrecoverable failures. */
export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred.") {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.SERVER_ERROR);
  }
}

/**
 * 403 — a shop's subscription/trial is inactive (common/middleware/
 * operationalAccess.ts). Same shape as UnauthorizedError: a message plus an
 * explicit code, so the caller can pick TRIAL_EXPIRED / SHOP_EXPIRED /
 * SHOP_SUSPENDED / SUBSCRIPTION_REQUIRED per situation while still throwing
 * one class.
 */
export class SubscriptionInactiveError extends AppError {
  constructor(message: string, code: ErrorCodeType = ErrorCode.SUBSCRIPTION_REQUIRED) {
    super(message, HttpStatus.FORBIDDEN, code);
  }
}

/**
 * 403 — a shop has hit its subscription plan's resource limit
 * (common/services/planLimits.ts) — e.g. `maxUsers`/`maxProducts`. Distinct
 * code so the frontend can point the user at `/dashboard/subscription`
 * specifically, rather than a generic "forbidden."
 */
export class PlanLimitExceededError extends AppError {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.PLAN_LIMIT_EXCEEDED);
  }
}

/**
 * 403 — multi-tenancy guard rail (common/middleware/tenant.ts). Thrown when
 * a Platform Admin (shopId = null) calls a shop-scoped route without
 * impersonation, or — in principle — a shop user's token somehow resolves
 * to a shop the request has no business touching. Kept distinct from the
 * generic ForbiddenError so tenant-boundary violations are identifiable by
 * `code` alone (useful for the tenant-isolation test suite and audit review).
 */
export class TenantAccessDeniedError extends AppError {
  constructor(message = "You do not have access to this shop's data.") {
    super(message, HttpStatus.FORBIDDEN, ErrorCode.TENANT_ACCESS_DENIED);
  }
}
