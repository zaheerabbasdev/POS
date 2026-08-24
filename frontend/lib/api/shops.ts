import { apiClient } from "../api-client";

export type ShopStatus = "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED" | "CANCELLED";

export interface ShopListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: ShopStatus;
  ownerName: string | null;
  ownerUsername: string | null;
  planName: string | null;
  trialEndDate: string | null;
  daysRemaining: number | null;
  createdAt: string;
}

export interface ShopDetail {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  logoUrl: string | null;
  status: ShopStatus;
  createdAt: string;
  owner: { id: string; username: string; email: string | null; name: string | null } | null;
  subscription: {
    id: string;
    status: string;
    startDate: string;
    endDate: string | null;
    paymentStatus: string;
    plan: { id: string; name: string; isTrial: boolean };
  } | null;
}

export interface ShopListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ShopStatus;
}

export interface CreateShopInput {
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
  };
}

export interface UpdateShopInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface ExtendTrialInput {
  days: number;
  reason: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

// GET /api/v1/admin/shops
export async function fetchShops(params: ShopListParams = {}): Promise<Paginated<ShopListItem>> {
  const { data } = await apiClient.get<Paginated<ShopListItem>>("/admin/shops", { params });
  return data;
}

// GET /api/v1/admin/shops/{id}
export async function fetchShop(id: string): Promise<ShopDetail> {
  const { data } = await apiClient.get<ApiSuccess<ShopDetail>>(`/admin/shops/${id}`);
  return data.data;
}

// POST /api/v1/admin/shops
export async function createShop(input: CreateShopInput): Promise<ShopDetail> {
  const { data } = await apiClient.post<ApiSuccess<ShopDetail>>("/admin/shops", input);
  return data.data;
}

// PATCH /api/v1/admin/shops/{id}
export async function updateShop(id: string, input: UpdateShopInput): Promise<ShopDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ShopDetail>>(`/admin/shops/${id}`, input);
  return data.data;
}

// PATCH /api/v1/admin/shops/{id}/suspend
export async function suspendShop(id: string): Promise<ShopDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ShopDetail>>(`/admin/shops/${id}/suspend`);
  return data.data;
}

// PATCH /api/v1/admin/shops/{id}/activate
export async function activateShop(id: string): Promise<ShopDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ShopDetail>>(`/admin/shops/${id}/activate`);
  return data.data;
}

// PATCH /api/v1/admin/shops/{id}/archive — a permanent close, not reversible.
export async function archiveShop(id: string): Promise<ShopDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ShopDetail>>(`/admin/shops/${id}/archive`);
  return data.data;
}

// POST /api/v1/admin/shops/{id}/extend-trial
export async function extendTrial(id: string, input: ExtendTrialInput): Promise<ShopDetail> {
  const { data } = await apiClient.post<ApiSuccess<ShopDetail>>(`/admin/shops/${id}/extend-trial`, input);
  return data.data;
}
