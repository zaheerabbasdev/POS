import { apiClient } from "../api-client";
import type { ShopStatus } from "./shops";

export interface ShopPerformanceRow {
  id: string;
  name: string;
  ownerName: string | null;
  status: ShopStatus;
  planName: string | null;
  totalSales: string;
  totalPurchases: string;
}

export interface SubscriptionOverviewRow {
  id: string;
  name: string;
  isTrial: boolean;
  isActive: boolean;
  price: string;
  currency: string;
  shopsCurrentlyOnPlan: number;
  lifetimeRevenue: string;
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// GET /api/v1/admin/reports/shops-performance
export async function fetchShopsPerformance(): Promise<ShopPerformanceRow[]> {
  const { data } = await apiClient.get<ApiSuccess<ShopPerformanceRow[]>>("/admin/reports/shops-performance");
  return data.data;
}

// GET /api/v1/admin/reports/subscription-overview
export async function fetchSubscriptionOverview(): Promise<SubscriptionOverviewRow[]> {
  const { data } = await apiClient.get<ApiSuccess<SubscriptionOverviewRow[]>>("/admin/reports/subscription-overview");
  return data.data;
}
