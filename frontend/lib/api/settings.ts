import { apiClient } from "../api-client";

export interface ShopSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_email: string;
  shop_logo: string;
  currency: string;
  timezone: string;
}

// GET /api/v1/settings (API Spec Chapter 30.1).
export async function fetchSettings(): Promise<ShopSettings> {
  const { data } = await apiClient.get<{ data: ShopSettings }>("/settings");
  return data.data;
}

// PATCH /api/v1/settings (API Spec Chapter 30.2).
export async function updateSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
  const { data } = await apiClient.patch<{ data: ShopSettings }>("/settings", input);
  return data.data;
}
