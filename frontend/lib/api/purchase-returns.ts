import { apiClient } from "../api-client";

export interface PurchaseReturnItemInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface CreatePurchaseReturnInput {
  purchaseId: string;
  supplierId: string;
  items: PurchaseReturnItemInput[];
  refundAmount?: number;
}

export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplier: string;
  returnDate: string;
  returnAmount: string;
  reason: string | null;
  createdBy: string | null;
  items: { productId: string; sku: string; name: string; quantity: number; reason: string | null }[];
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/purchase-returns (API Spec Chapter 33.1).
export async function fetchPurchaseReturns(params: { purchaseId?: string; page?: number; limit?: number } = {}): Promise<
  Paginated<PurchaseReturn>
> {
  const { data } = await apiClient.get<Paginated<PurchaseReturn>>("/purchase-returns", { params });
  return data;
}

// POST /api/v1/purchase-returns (API Spec Chapter 33.2).
export async function createPurchaseReturn(input: CreatePurchaseReturnInput): Promise<PurchaseReturn> {
  const { data } = await apiClient.post<{ data: PurchaseReturn }>("/purchase-returns", input);
  return data.data;
}
