import { prisma } from "../../config/prisma.js";
import { comparePassword, hashPassword } from "../../common/utils/password.js";
import { signAccessToken } from "../../common/utils/jwt.js";
import { generateResetToken, hashResetToken } from "../../common/utils/token.js";
import { getDisplayName, getPrimaryRoleName } from "../../common/utils/userDisplay.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../common/errors/AppError.js";
import { logger } from "../../common/logger/logger.js";
import { sendEmail } from "../../config/mailer.js";
import { frontendUrl } from "../../config/env.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const authUserSelect = {
  id: true,
  username: true,
  password: true,
  isActive: true,
  employeeId: true,
  employee: { select: { firstName: true, lastName: true } },
  roles: {
    select: {
      role: {
        select: {
          id: true,
          roleName: true,
          permissions: { select: { permission: { select: { permissionName: true } } } },
        },
      },
    },
  },
} as const;

function flattenPermissions(roles: { role: { permissions: { permission: { permissionName: string } }[] } }[]) {
  return [...new Set(roles.flatMap((r) => r.role.permissions.map((rp) => rp.permission.permissionName)))];
}

/** POST /api/v1/auth/login (API Spec Chapter 11). */
export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: authUserSelect });

  // Same message whether the username doesn't exist or the password is
  // wrong — avoids revealing which usernames are registered.
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid username or password.");
  }

  const passwordMatches = await comparePassword(password, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid username or password.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const token = signAccessToken({
    sub: user.id,
    username: user.username,
    employeeId: user.employeeId,
    roleIds: user.roles.map((r) => r.role.id),
  });

  return {
    token,
    user: { id: user.id, name: getDisplayName(user), role: getPrimaryRoleName(user) },
  };
}

/** GET /api/v1/auth/me (API Spec Chapter 13). */
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: authUserSelect });
  if (!user) throw new NotFoundError("User not found.");

  return {
    id: user.id,
    name: getDisplayName(user),
    role: getPrimaryRoleName(user),
    permissions: flattenPermissions(user.roles),
  };
}

/** PATCH /api/v1/auth/change-password (API Spec Chapter 14). */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, password: true } });
  if (!user) throw new NotFoundError("User not found.");

  const matches = await comparePassword(currentPassword, user.password);
  if (!matches) throw new BadRequestError("Current password is incorrect.");

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

/** POST /api/v1/auth/forgot-password (API Spec Chapter 15). */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always resolve the same way regardless of whether the email is known,
  // to avoid leaking which emails have accounts (SAD Chapter 40).
  if (!user) {
    logger.info({ email }, "Password reset requested for an unknown email");
    return;
  }

  const { token, tokenHash } = generateResetToken();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  const sent = await sendEmail({
    to: email,
    subject: "Reset your Mobile Shop POS password",
    text: `We received a request to reset your password. Reset it here (expires in 1 hour): ${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your Mobile Shop POS password.</p>
      <p><a href="${resetLink}">Click here to reset your password</a> (link expires in 1 hour).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  // Falls back to a log line when SMTP isn't configured (see config/mailer.ts)
  // rather than failing the request — the response to the client is
  // identical either way (SAD Chapter 40 anti-enumeration).
  if (!sent) {
    logger.warn({ userId: user.id, resetToken: token }, "Password reset token generated — email delivery not configured");
  }
}

/** POST /api/v1/auth/reset-password (API Spec Chapter 10 overview). */
export async function resetPassword(token: string, newPassword: string): Promise<{ userId: string }> {
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new BadRequestError("This password reset link is invalid or has expired.");
  }

  const hashed = await hashPassword(newPassword);

  // Multi-step write — SAD Chapter 22 requires this to be transactional.
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  return { userId: resetToken.userId };
}
