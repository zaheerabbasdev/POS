import type { Request } from "express";
import { prisma } from "../../config/prisma.js";
import { logger } from "../logger/logger.js";

export interface LogAuditInput {
  userId?: string | null;
  module: string;
  action: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes one row to audit_logs (DDD Chapter 31). Deliberately swallows its
 * own errors — a logging failure must never roll back or fail the real
 * mutation it's recording. Called directly (not queued) since these are
 * low-volume, admin-triggered actions, not hot-path traffic.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        module: input.module,
        action: input.action,
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
    });
  } catch (err) {
    logger.error({ err, module: input.module, action: input.action }, "Failed to write audit log");
  }
}

/** Convenience wrapper — pulls actor/IP/user-agent off an authenticated request. */
export function logAuditFromRequest(req: Request, module: string, action: string, description?: string): Promise<void> {
  return logAudit({
    userId: req.user?.id ?? null,
    module,
    action,
    description: description ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
}
