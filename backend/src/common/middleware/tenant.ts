import type { NextFunction, Request, Response } from "express";
import { TenantAccessDeniedError } from "../errors/AppError.js";

/**
 * Multi-tenancy — the single place every tenant-scoped controller pulls its
 * shopId from, instead of reading `req.user.shopId` ad hoc. The shopId
 * always comes from the authenticated user's own record (re-resolved from
 * the database on every request by `authenticate`), never from client
 * input (a body/query/param `shopId` must never be trusted for
 * authorization — see PROJECT_DOCUMENTATION.md's multi-tenancy section).
 *
 * Throws if the caller is a Platform Admin (`shopId === null`) — Platform
 * Admins operate above the tenant level and have their own `/admin/*`
 * routes; they don't get to call ordinary shop routes and implicitly act as
 * whichever shop they like. (Impersonation, if ever added, would be its own
 * explicit, audited flow — not this.)
 */
export function getShopId(req: Request): string {
  if (!req.user) {
    throw new TenantAccessDeniedError("Authentication required.");
  }
  if (req.user.shopId === null) {
    throw new TenantAccessDeniedError(
      "Platform Admin accounts cannot access shop-scoped data directly.",
    );
  }
  return req.user.shopId;
}

/**
 * Router-level guard for `/admin/*` platform routes (mirrors how
 * `authenticate` is applied via `router.use(...)`) — rejects any user whose
 * token resolves to a real shop, as defense-in-depth alongside the
 * PLATFORM_* permission checks on each individual route.
 */
export function requirePlatformContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new TenantAccessDeniedError("Authentication required."));
    return;
  }
  if (req.user.shopId !== null) {
    next(new TenantAccessDeniedError("This endpoint is only available to Platform Admin accounts."));
    return;
  }
  next();
}
