import { apiClient } from "../api-client";

export interface SalesReturnItemInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface CreateSalesReturnInput {
  saleId: string;
  items: SalesReturnItemInput[];
  refundMethod: string;
}

export interface SalesReturn {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customer: string;
  returnDate: string;
  refundAmount: string;
  returnReason: string | null;
  approvedBy: string | null;
  items: { productId: string; sku: string; name: string; quantity: number; reason: string | null }[];
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SalesReturnListParams {
  saleId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// GET /api/v1/sales-returns (API Spec Chapter 35.1).
export async function fetchSalesReturns(params: SalesReturnListParams = {}): Promise<Paginated<SalesReturn>> {
  const { data } = await apiClient.get<Paginated<SalesReturn>>("/sales-returns", { params });
  return data;
}

// POST /api/v1/sales-returns (API Spec Chapter 35.2).
export async function createSalesReturn(input: CreateSalesReturnInput): Promise<SalesReturn> {
  const { data } = await apiClient.post<{ data: SalesReturn }>("/sales-returns", input);
  return data.data;
}
