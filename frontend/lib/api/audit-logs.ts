import { apiClient } from "../api-client";

export interface AuditLogRow {
  id: string;
  userId: string | null;
  username: string | null;
  module: string;
  action: string;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/audit-logs (DDD Chapter 31), gated by AUDIT_VIEW.
export async function fetchAuditLogs(params: AuditLogListParams = {}): Promise<Paginated<AuditLogRow>> {
  const { data } = await apiClient.get<Paginated<AuditLogRow>>("/audit-logs", { params });
  return data;
}
