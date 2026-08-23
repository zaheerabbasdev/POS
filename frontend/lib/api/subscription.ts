import { apiClient } from "../api-client";
import type { SubscriptionPlan } from "./subscription-plans";

export interface CurrentSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  paymentStatus: string;
  amount: string;
  plan: {
    id: string;
    name: string;
    isTrial: boolean;
    price: string;
    currency: string;
    durationDays: number;
  };
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// GET /api/v1/subscription
export async function fetchCurrentSubscription(): Promise<CurrentSubscription> {
  const { data } = await apiClient.get<ApiSuccess<CurrentSubscription>>("/subscription");
  return data.data;
}

// GET /api/v1/subscription/plans — active, non-trial plans the shop can switch to.
export async function fetchSelectablePlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<ApiSuccess<SubscriptionPlan[]>>("/subscription/plans");
  return data.data;
}

// POST /api/v1/subscription/select-plan
export async function selectPlan(planId: string): Promise<CurrentSubscription> {
  const { data } = await apiClient.post<ApiSuccess<CurrentSubscription>>("/subscription/select-plan", { planId });
  return data.data;
}
