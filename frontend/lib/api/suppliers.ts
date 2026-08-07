import { apiClient } from "../api-client";

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  paymentTerms: string | null;
  outstandingBalance: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
}

export interface SupplierInput {
  name: string;
  phone: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/suppliers (API Spec Chapter 28.1).
export async function fetchSuppliers(params: SupplierListParams = {}): Promise<Paginated<Supplier>> {
  const { data } = await apiClient.get<Paginated<Supplier>>("/suppliers", { params });
  return data;
}

// POST /api/v1/suppliers (API Spec Chapter 28.2).
export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await apiClient.post<{ data: Supplier }>("/suppliers", input);
  return data.data;
}

// PATCH /api/v1/suppliers/{id} (API Spec Chapter 28.3).
export async function updateSupplier(id: string, input: Partial<SupplierInput & { status: "active" | "inactive" }>): Promise<Supplier> {
  const { data } = await apiClient.patch<{ data: Supplier }>(`/suppliers/${id}`, input);
  return data.data;
}
