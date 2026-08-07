import rateLimit from "express-rate-limit";
import { HttpStatus } from "../constants/httpStatus.js";
import { ErrorCode } from "../constants/errorCodes.js";

// API-wide rate limiting (SAD Chapter 40 — Security Architecture).
// Per-route limiters (e.g. a stricter one for /auth/login) can be layered
// on top of this once the auth module exists.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
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
  handler: (_req, res) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      success: false,
      message: "Too many attempts. Please try again later.",
      code: ErrorCode.TOO_MANY_REQUESTS,
    });
  },
});
