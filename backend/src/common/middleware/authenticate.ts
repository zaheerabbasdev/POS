import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME } from "../constants/auth.js";
import { UnauthorizedError } from "../errors/AppError.js";
import { ErrorCode } from "../constants/errorCodes.js";
import { asyncHandler } from "./asyncHandler.js";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === "string" ? cookieToken : null;
}

/**
 * Verifies the JWT (SAD Chapter 16) and re-loads the user's roles and
 * permissions from the database on every request — no caching yet (that's
 * flagged as a future enhancement in SAD Chapter 37) so a permission change
 * takes effect immediately instead of waiting for the token to expire.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError("Authentication token is missing.", ErrorCode.TOKEN_MISSING);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Session has expired. Please log in again.", ErrorCode.TOKEN_EXPIRED);
    }
    throw new UnauthorizedError("Invalid authentication token.", ErrorCode.AUTH_FAILED);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      employeeId: true,
      shopId: true,
      isActive: true,
      roles: {
        select: {
          role: {
            select: {
              roleName: true,
              permissions: { select: { permission: { select: { permissionName: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Account is inactive or no longer exists.", ErrorCode.AUTH_FAILED);
  }

  const roles = user.roles.map((userRole) => userRole.role.roleName);
  const permissions = [
    ...new Set(
      user.roles.flatMap((userRole) => userRole.role.permissions.map((rp) => rp.permission.permissionName)),
    ),
  ];

  req.user = {
    id: user.id,
    username: user.username,
    employeeId: user.employeeId,
    shopId: user.shopId,
    roles,
    permissions,
  };
  next();
});
