import { apiClient } from "../api-client";

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  customerType: "REGULAR" | "WHOLESALE" | "VIP" | "CORPORATE";
  creditLimit: string;
  outstandingBalance: string;
  notes: string | null;
  attachmentUrl: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: Customer["customerType"];
  status?: "active" | "inactive";
}

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  customerType?: Customer["customerType"];
  creditLimit?: number;
  notes?: string;
}

export interface CustomerHistory {
  sales: { id: string; invoiceNumber: string; saleDate: string; totalAmount: string; paymentStatus: string }[];
  payments: { id: string; referenceId: string; amount: string; paymentMethod: string; paymentDate: string; notes: string | null }[];
  outstandingBalance: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/customers (API Spec Chapter 27.1).
export async function fetchCustomers(params: CustomerListParams = {}): Promise<Paginated<Customer>> {
  const { data } = await apiClient.get<Paginated<Customer>>("/customers", { params });
  return data;
}

// GET /api/v1/customers/{id}.
export async function fetchCustomer(id: string): Promise<Customer> {
  const { data } = await apiClient.get<{ data: Customer }>(`/customers/${id}`);
  return data.data;
}

export async function fetchCustomerHistory(id: string): Promise<CustomerHistory> {
  const { data } = await apiClient.get<{ data: CustomerHistory }>(`/customers/${id}/history`);
  return data.data;
}

// POST /api/v1/customers (API Spec Chapter 27.2).
export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data } = await apiClient.post<{ data: Customer }>("/customers", input);
  return data.data;
}

// PATCH /api/v1/customers/{id} (API Spec Chapter 27.3).
export async function updateCustomer(id: string, input: Partial<CustomerInput & { status: "active" | "inactive" }>): Promise<Customer> {
  const { data } = await apiClient.patch<{ data: Customer }>(`/customers/${id}`, input);
  return data.data;
}
