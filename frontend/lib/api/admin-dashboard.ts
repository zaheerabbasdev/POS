import { apiClient } from "../api-client";
import type { ShopStatus } from "./shops";

export interface PlatformDashboardSummary {
  totalShops: number;
  activeShops: number;
  trialShops: number;
  expiringTrials: number;
  expiredShops: number;
  suspendedShops: number;
  totalUsers: number;
  newSubscriptionRevenueThisMonth: string;
  recentShops: {
    id: string;
    name: string;
    ownerName: string | null;
    status: ShopStatus;
    createdAt: string;
  }[];
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// GET /api/v1/admin/dashboard/summary
export async function fetchPlatformDashboardSummary(): Promise<PlatformDashboardSummary> {
  const { data } = await apiClient.get<ApiSuccess<PlatformDashboardSummary>>("/admin/dashboard/summary");
  return data.data;
}
