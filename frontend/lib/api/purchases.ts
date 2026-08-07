import { apiClient } from "../api-client";

export interface PurchaseListItem {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplier: string;
  totalAmount: string;
  status: "PENDING" | "PARTIAL" | "PAID";
}

export interface PurchaseDetail {
  id: string;
  invoiceNo: string;
  purchaseDate: string;
  supplier: { id: string; code: string; name: string; phone: string | null };
  items: {
    id: string;
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    purchasePrice: string;
    discount: string;
    tax: string;
    lineTotal: string;
    imeis: string[];
  }[];
  subtotal: string;
  discount: string;
  tax: string;
  shippingCost: string;
  totalAmount: string;
  status: "PENDING" | "PARTIAL" | "PAID";
  remarks: string | null;
  payments: { id: string; amount: string; method: string; date: string; notes: string | null }[];
  createdAt: string;
}

export interface PurchaseListParams {
  page?: number;
  limit?: number;
  supplierId?: string;
  status?: PurchaseListItem["status"];
}

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  purchasePrice: number;
  discount?: number;
  tax?: number;
  imeis?: string[];
}

export interface CreatePurchaseInput {
  supplierId: string;
  invoiceNo?: string;
  purchaseDate?: string;
  items: CreatePurchaseItemInput[];
  discount?: number;
  shippingCost?: number;
  remarks?: string;
  payment?: { method: string; amount: number };
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/purchases (API Spec Chapter 31.1).
export async function fetchPurchases(params: PurchaseListParams = {}): Promise<Paginated<PurchaseListItem>> {
  const { data } = await apiClient.get<Paginated<PurchaseListItem>>("/purchases", { params });
  return data;
}

// GET /api/v1/purchases/{id} (API Spec Chapter 31.2).
export async function fetchPurchase(id: string): Promise<PurchaseDetail> {
  const { data } = await apiClient.get<{ data: PurchaseDetail }>(`/purchases/${id}`);
  return data.data;
}

// POST /api/v1/purchases (API Spec Chapter 31.3).
export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDetail> {
  const { data } = await apiClient.post<{ data: PurchaseDetail }>("/purchases", input);
  return data.data;
}
