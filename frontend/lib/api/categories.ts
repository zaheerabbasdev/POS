import { apiClient } from "../api-client";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

export interface CategoryInput {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/categories (API Spec Chapter 24.1).
export async function fetchCategories(params: CategoryListParams = {}): Promise<Paginated<Category>> {
  const { data } = await apiClient.get<Paginated<Category>>("/categories", { params });
  return data;
}

// POST /api/v1/categories (API Spec Chapter 24.2).
export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data } = await apiClient.post<{ data: Category }>("/categories", input);
  return data.data;
}

// PATCH /api/v1/categories/{id} (API Spec Chapter 24.3).
export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const { data } = await apiClient.patch<{ data: Category }>(`/categories/${id}`, input);
  return data.data;
}

// DELETE /api/v1/categories/{id} (API Spec Chapter 24.4).
export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
