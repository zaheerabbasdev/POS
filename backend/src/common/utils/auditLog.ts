import type { Request } from "express";
import { prisma } from "../../config/prisma.js";
import { logger } from "../logger/logger.js";

export interface LogAuditInput {
  // Multi-tenancy: NULL = a platform-level entry (e.g. Platform Admin
  // actions); non-NULL = scoped to that shop's own audit log view. Every
  // shop-triggered call should pass the acting user's shopId — omitting it
  // silently miscategorizes the entry as platform-level, which would make
  // it invisible from that shop's Audit Log page. logAuditFromRequest below
  // fills this in automatically from req.user, so prefer that helper over
  // calling logAudit directly wherever a request is available.
  shopId?: string | null;
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
        shopId: input.shopId ?? null,
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

/** Convenience wrapper — pulls actor/shop/IP/user-agent off an authenticated request. */
export function logAuditFromRequest(req: Request, module: string, action: string, description?: string): Promise<void> {
  return logAudit({
    shopId: req.user?.shopId ?? null,
    userId: req.user?.id ?? null,
    module,
    action,
    description: description ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  });
}
