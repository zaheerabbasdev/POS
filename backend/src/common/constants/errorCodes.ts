// Machine-readable error codes (API Specification Document, Chapter 17 —
// API Error Handling Standard). Kept stable so the frontend can branch on
// `code` instead of parsing `message` text.
export const ErrorCode = {
  AUTH_FAILED: "AUTH_FAILED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_MISSING: "TOKEN_MISSING",
  ACCESS_DENIED: "ACCESS_DENIED",
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
  DUPLICATE_RECORD: "DUPLICATE_RECORD",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  SERVER_ERROR: "SERVER_ERROR",

  // Multi-tenancy (SaaS platform layer) — see common/middleware/tenant.ts.
  TENANT_ACCESS_DENIED: "TENANT_ACCESS_DENIED",
  SHOP_NOT_FOUND: "SHOP_NOT_FOUND",
  SHOP_SUSPENDED: "SHOP_SUSPENDED",
  SHOP_EXPIRED: "SHOP_EXPIRED",
  TRIAL_EXPIRED: "TRIAL_EXPIRED",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
  PLAN_INACTIVE: "PLAN_INACTIVE",
  TRIAL_EXTENSION_INVALID: "TRIAL_EXTENSION_INVALID",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
