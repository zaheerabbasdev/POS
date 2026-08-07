import { apiClient } from "../api-client";

export interface SaleListItem {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customer: string;
  cashier: string | null;
  totalAmount: string;
  status: "PAID" | "PARTIAL" | "UNPAID";
  isCancelled: boolean;
  saleDate: string;
}

export interface SaleDetail {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  customer: { id: string; code: string; name: string; phone: string | null } | null;
  cashier: string | null;
  items: {
    id: string;
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    price: string;
    discount: string;
    tax: string;
    lineTotal: string;
    imei: string | null;
    warranty: { warrantyNumber: string; periodMonths: number; startDate: string; expiryDate: string; status: string } | null;
  }[];
  subtotal: string;
  discount: string;
  tax: string;
  totalAmount: string;
  paidAmount: string;
  dueAmount: string;
  status: "PAID" | "PARTIAL" | "UNPAID";
  isCancelled: boolean;
  cancelledAt: string | null;
  cancelReason: string | null;
  remarks: string | null;
  payments: { id: string; type: string; amount: string; method: string; date: string; notes: string | null }[];
  createdAt: string;
}

export interface SaleListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: SaleListItem["status"];
  invoiceNumber?: string;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
  tax?: number;
  imei?: string;
}

export interface CreateSaleInput {
  customerId?: string;
  items: CreateSaleItemInput[];
  discount?: number;
  payment?: { method: string; paidAmount: number };
  remarks?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/sales (API Spec Chapter 34.1).
export async function fetchSales(params: SaleListParams = {}): Promise<Paginated<SaleListItem>> {
  const { data } = await apiClient.get<Paginated<SaleListItem>>("/sales", { params });
  return data;
}

// GET /api/v1/sales/{id} (API Spec Chapter 34.2).
export async function fetchSale(id: string): Promise<SaleDetail> {
  const { data } = await apiClient.get<{ data: SaleDetail }>(`/sales/${id}`);
  return data.data;
}

// POST /api/v1/sales (API Spec Chapter 34.3).
export async function createSale(input: CreateSaleInput): Promise<SaleDetail> {
  const { data } = await apiClient.post<{ data: SaleDetail }>("/sales", input);
  return data.data;
}

// PATCH /api/v1/sales/{id}/cancel (API Spec Chapter 34.4).
export async function cancelSale(id: string, reason?: string): Promise<SaleDetail> {
  const { data } = await apiClient.patch<{ data: SaleDetail }>(`/sales/${id}/cancel`, reason ? { reason } : {});
  return data.data;
}
