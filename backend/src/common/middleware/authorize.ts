import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError.js";

/**
 * RBAC gate (SAD Chapter 17 — Authorization). Must run after `authenticate`.
 * Grants access if the user holds ANY of the listed permission codes
 * (e.g. requirePermission("SALE_VIEW", "SALE_CREATE")).
 */
export function requirePermission(...permissionCodes: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const hasPermission = permissionCodes.some((code) => req.user!.permissions.includes(code));
    if (!hasPermission) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

/** Coarser gate for endpoints restricted by role name rather than a granular permission. */
export function requireRole(...roleNames: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    const hasRole = roleNames.some((role) => req.user!.roles.includes(role));
    if (!hasRole) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
