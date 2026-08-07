import { apiClient } from "../api-client";

export interface Warranty {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customerId: string;
  customer: string;
  customerPhone: string | null;
  productId: string;
  sku: string;
  product: string;
  imei: string | null;
  warrantyType: string;
  periodMonths: number;
  startDate: string;
  expiryDate: string;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "CANCELLED";
  remarks: string | null;
  createdAt: string;
}

export interface WarrantyListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  productId?: string;
  status?: Warranty["status"];
  expiringWithinDays?: number;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/warranties (API Spec Chapter 42.1).
export async function fetchWarranties(params: WarrantyListParams = {}): Promise<Paginated<Warranty>> {
  const { data } = await apiClient.get<Paginated<Warranty>>("/warranties", { params });
  return data;
}

// POST /api/v1/warranties/claim (API Spec Chapter 42.2) — also opens a linked repair ticket.
export async function createWarrantyClaim(input: { warrantyId: string; issue: string }): Promise<{
  warranty: Warranty;
  repairId: string;
}> {
  const { data } = await apiClient.post<{ data: { warranty: Warranty; repairId: string } }>("/warranties/claim", input);
  return data.data;
}
