import { apiClient } from "../api-client";

export interface ProductModel {
  id: string;
  name: string;
  brandId: string;
  brand: string;
  releaseYear: number | null;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface ProductModelListParams {
  page?: number;
  limit?: number;
  search?: string;
  brandId?: string;
  status?: "active" | "inactive";
}

export interface ProductModelInput {
  name: string;
  brandId: string;
  releaseYear?: number;
  description?: string;
  status?: "active" | "inactive";
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/models (API Spec Chapter 25.1).
export async function fetchProductModels(params: ProductModelListParams = {}): Promise<Paginated<ProductModel>> {
  const { data } = await apiClient.get<Paginated<ProductModel>>("/models", { params });
  return data;
}

// POST /api/v1/models (API Spec Chapter 25.2).
export async function createProductModel(input: ProductModelInput): Promise<ProductModel> {
  const { data } = await apiClient.post<{ data: ProductModel }>("/models", input);
  return data.data;
}

// PATCH /api/v1/models/{id} (API Spec Chapter 25.3).
export async function updateProductModel(id: string, input: Partial<ProductModelInput>): Promise<ProductModel> {
  const { data } = await apiClient.patch<{ data: ProductModel }>(`/models/${id}`, input);
  return data.data;
}

// DELETE /api/v1/models/{id} (API Spec Chapter 25.4).
export async function deleteProductModel(id: string): Promise<void> {
  await apiClient.delete(`/models/${id}`);
}
