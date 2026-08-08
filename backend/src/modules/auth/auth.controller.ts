import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { parseDurationMs } from "../../common/utils/duration.js";
import { AUTH_COOKIE_NAME } from "../../common/constants/auth.js";
import { env, isProduction } from "../../config/env.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { logAudit, logAuditFromRequest } from "../../common/utils/auditLog.js";
import * as authService from "./auth.service.js";

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
    path: "/",
  });
}

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  const { token, user } = await authService.login(username, password);
  setAuthCookie(res, token);
  sendSuccess(res, { user, token }, "Login successful.");
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  sendSuccess(res, null, "Logout successful.");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const user = await authService.getCurrentUser(req.user.id);
  sendSuccess(res, user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  await authService.changePassword(req.user.id, currentPassword, newPassword);
  void logAuditFromRequest(req, "Auth", "CHANGE_PASSWORD", "User changed their own password.");
  sendSuccess(res, null, "Password changed successfully.");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  await authService.forgotPassword(email);
  sendSuccess(res, null, "If an account with that email exists, a password reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const { userId } = await authService.resetPassword(token, newPassword);
  void logAudit({
    userId,
    module: "Auth",
    action: "RESET_PASSWORD",
    description: "Password reset via emailed link.",
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
  sendSuccess(res, null, "Password has been reset successfully.");
});
