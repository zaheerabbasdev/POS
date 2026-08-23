import { apiClient } from "../api-client";
import type { AuthUser } from "./auth";

export interface RegisterShopInput {
  shop: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  owner: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
}

export interface RegisterShopResult {
  user: AuthUser;
  trial: {
    status: string;
    startDate: string;
    endDate: string | null;
  };
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// POST /api/v1/registration/shop
export async function registerShop(input: RegisterShopInput): Promise<RegisterShopResult> {
  const { data } = await apiClient.post<ApiSuccess<RegisterShopResult>>("/registration/shop", input);
  return data.data;
}
