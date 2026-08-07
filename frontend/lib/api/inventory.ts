import { apiClient } from "../api-client";

export interface InventoryItem {
  productId: string;
  sku: string;
  name: string;
  brandId: string | null;
  brand: string | null;
  categoryId: string;
  category: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  location: string | null;
  updatedAt: string;
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  productId?: string;
  categoryId?: string;
  brandId?: string;
  stockStatus?: "in_stock" | "low_stock" | "out_of_stock";
}

export interface StockHistoryEntry {
  id: string;
  type: string;
  quantity: number;
  referenceNumber: string | null;
  remarks: string | null;
  performedBy: string | null;
  createdAt: string;
}

export interface AdjustmentInput {
  productId: string;
  type: "increase" | "decrease";
  quantity: number;
  reason: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/inventory (API Spec Chapter 38.1).
export async function fetchInventory(params: InventoryListParams = {}): Promise<Paginated<InventoryItem>> {
  const { data } = await apiClient.get<Paginated<InventoryItem>>("/inventory", { params });
  return data;
}

// GET /api/v1/inventory/{productId}/history (API Spec Chapter 38.2).
export async function fetchStockHistory(productId: string): Promise<StockHistoryEntry[]> {
  const { data } = await apiClient.get<{ data: StockHistoryEntry[] }>(`/inventory/${productId}/history`);
  return data.data;
}

// POST /api/v1/inventory/adjustment (API Spec Chapter 39.1).
export async function createAdjustment(input: AdjustmentInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<{ data: InventoryItem }>("/inventory/adjustment", input);
  return data.data;
}
