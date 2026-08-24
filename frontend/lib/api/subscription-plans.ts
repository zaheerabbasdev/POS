import { apiClient } from "../api-client";

export type BillingInterval = "MONTHLY" | "YEARLY" | "CUSTOM";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingInterval: BillingInterval;
  durationDays: number;
  isTrial: boolean;
  isActive: boolean;
  // null = unlimited.
  maxUsers: number | null;
  maxProducts: number | null;
  createdAt: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  durationDays: number;
  maxUsers?: number | null;
  maxProducts?: number | null;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingInterval?: BillingInterval;
  durationDays?: number;
  isActive?: boolean;
  maxUsers?: number | null;
  maxProducts?: number | null;
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// GET /api/v1/admin/subscription-plans
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<ApiSuccess<SubscriptionPlan[]>>("/admin/subscription-plans");
  return data.data;
}

// POST /api/v1/admin/subscription-plans
export async function createSubscriptionPlan(input: CreatePlanInput): Promise<SubscriptionPlan> {
  const { data } = await apiClient.post<ApiSuccess<SubscriptionPlan>>("/admin/subscription-plans", input);
  return data.data;
}

// PATCH /api/v1/admin/subscription-plans/{id}
export async function updateSubscriptionPlan(id: string, input: UpdatePlanInput): Promise<SubscriptionPlan> {
  const { data } = await apiClient.patch<ApiSuccess<SubscriptionPlan>>(`/admin/subscription-plans/${id}`, input);
  return data.data;
}
