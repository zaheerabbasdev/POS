import { apiClient } from "../api-client";

export interface Brand {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface BrandListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

export interface BrandInput {
  name: string;
  description?: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/brands (API Spec Chapter 23.1).
export async function fetchBrands(params: BrandListParams = {}): Promise<Paginated<Brand>> {
  const { data } = await apiClient.get<Paginated<Brand>>("/brands", { params });
  return data;
}

// POST /api/v1/brands (API Spec Chapter 23.2).
export async function createBrand(input: BrandInput): Promise<Brand> {
  const { data } = await apiClient.post<{ data: Brand }>("/brands", input);
  return data.data;
}

// PATCH /api/v1/brands/{id} (API Spec Chapter 23.3).
export async function updateBrand(id: string, input: Partial<BrandInput>): Promise<Brand> {
  const { data } = await apiClient.patch<{ data: Brand }>(`/brands/${id}`, input);
  return data.data;
}

// DELETE /api/v1/brands/{id} (API Spec Chapter 23.4).
export async function deleteBrand(id: string): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}
