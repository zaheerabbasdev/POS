import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";

export interface ListAuditLogsInput extends PaginationQuery {
  module?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/audit-logs — read-only trail, gated by AUDIT_VIEW. */
export async function listAuditLogs(shopId: string, input: ListAuditLogsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.AuditLogWhereInput = {
    shopId,
    ...(input.module ? { module: input.module } : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.startDate || input.endDate
      ? { createdAt: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) } }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.user?.username ?? null,
      module: log.module,
      action: log.action,
      description: log.description,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    })),
    pagination: buildPaginationMeta(page, limit, total),
  };
}
