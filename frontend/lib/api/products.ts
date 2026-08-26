import { apiClient } from "../api-client";

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  categoryId: string;
  category: string;
  brandId: string | null;
  brand: string | null;
  modelId: string | null;
  model: string | null;
  price: string;
  stock: number;
  status: "active" | "inactive";
  tracksImei: boolean;
  availableImeis: string[];
}

export interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
}

export interface ProductImei {
  id: string;
  imeiNumber: string;
  status: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
}

export interface ProductDetail extends ProductListItem {
  purchasePrice: string;
  wholesalePrice: string | null;
  taxPercentage: string;
  warrantyMonths: number | null;
  description: string | null;
  reorderLevel: number;
  availableStock: number;
  images: ProductImage[];
  imeiNumbers: ProductImei[];
  createdAt: string;
  updatedAt: string;
  purchaseHistory: unknown[];
  salesHistory: unknown[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  modelId?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
  minPrice?: number;
  maxPrice?: number;
  status?: "active" | "inactive";
}

export interface ProductInput {
  name: string;
  sku?: string;
  categoryId: string;
  brandId?: string;
  modelId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxPercentage?: number;
  warrantyMonths?: number;
  barcode?: string;
  description?: string;
  stock?: number;
  imeis?: string[];
  reorderLevel?: number;
  status?: "active" | "inactive";
  tracksImei?: boolean;
}

export type UpdateProductInput = Partial<Omit<ProductInput, "sku" | "stock">>;

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/products (API Spec Chapter 26.1).
export async function fetchProducts(params: ProductListParams = {}): Promise<Paginated<ProductListItem>> {
  const { data } = await apiClient.get<Paginated<ProductListItem>>("/products", { params });
  return data;
}

// GET /api/v1/products/{id} (API Spec Chapter 26.2).
export async function fetchProduct(id: string): Promise<ProductDetail> {
  const { data } = await apiClient.get<{ data: ProductDetail }>(`/products/${id}`);
  return data.data;
}

// POST /api/v1/products (API Spec Chapter 26.3).
export async function createProduct(input: ProductInput): Promise<ProductDetail> {
  const { data } = await apiClient.post<{ data: ProductDetail }>("/products", input);
  return data.data;
}

// PATCH /api/v1/products/{id} (API Spec Chapter 26.5).
export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDetail> {
  const { data } = await apiClient.patch<{ data: ProductDetail }>(`/products/${id}`, input);
  return data.data;
}

// DELETE /api/v1/products/{id} (API Spec Chapter 26.6).
export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

// POST /api/v1/products/{id}/image (API Spec Chapter 26.4).
export async function uploadProductImage(id: string, file: File): Promise<ProductImage> {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post<{ data: ProductImage }>(`/products/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data;
}
