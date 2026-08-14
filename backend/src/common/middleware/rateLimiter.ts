import rateLimitImport, {
  type Options as RateLimitOptions,
  type RateLimitRequestHandler,
} from "express-rate-limit";
import type { Request, Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode } from "../constants/errorCodes.js";

// express-rate-limit ships a `.d.cts` declaration file with the same
// ESM-style `export {rateLimit as default}` statement inside a CJS-typed
// file that helmet uses (see the identical unwrap in app.ts) — different
// TypeScript versions have interpreted this inconsistently under strict
// NodeNext/verbatimModuleSyntax settings, resolving `rateLimitImport` as
// non-callable on some builds (observed on Vercel) even when it typechecks
// fine locally. Asserting an explicit, independent function signature
// (taken straight from express-rate-limit's own .d.cts) instead of reusing
// `typeof rateLimitImport` sidesteps however a given TS version resolves
// the original import.
const rateLimit = rateLimitImport as unknown as (
  options?: Partial<RateLimitOptions>,
) => RateLimitRequestHandler;

// API-wide rate limiting (SAD Chapter 40 — Security Architecture).
// Per-route limiters (e.g. a stricter one for /auth/login) can be layered
// on top of this once the auth module exists.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      message: "Too many requests. Please try again later.",
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
  },
});

// Stricter limiter for credential-guessing-prone endpoints (login,
// forgot-password) — SAD Chapter 40 calls out rate limiting explicitly.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      message: "Too many attempts. Please try again later.",
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
  },
});
