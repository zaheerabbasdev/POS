import { apiClient } from "../api-client";

export type RepairStatus =
  | "RECEIVED"
  | "UNDER_INSPECTION"
  | "WAITING_FOR_PARTS"
  | "IN_PROGRESS"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface RepairListItem {
  id: string;
  repairTicketNumber: string;
  customerId: string;
  customer: string;
  customerPhone: string | null;
  device: string | null;
  imei: string | null;
  technician: string | null;
  problemDescription: string;
  estimatedCost: string;
  actualCost: string;
  status: RepairStatus;
  receivedDate: string;
  expectedDeliveryDate: string | null;
  deliveredDate: string | null;
}

export interface RepairDetail extends RepairListItem {
  diagnosis: string | null;
  remarks: string | null;
  items: { id: string; productId: string; sku: string; name: string; quantity: number; unitPrice: string; totalPrice: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface RepairListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  technicianId?: string;
  status?: RepairStatus;
}

export interface CreateRepairInput {
  customerId: string;
  device?: string;
  productId?: string;
  imei?: string;
  problem: string;
  technicianId?: string;
  estimatedCost?: number;
  expectedDeliveryDate?: string;
}

export interface UpdateRepairInput {
  diagnosis?: string;
  technicianId?: string;
  estimatedCost?: number;
  actualCost?: number;
  expectedDeliveryDate?: string;
  remarks?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/repairs.
export async function fetchRepairs(params: RepairListParams = {}): Promise<Paginated<RepairListItem>> {
  const { data } = await apiClient.get<Paginated<RepairListItem>>("/repairs", { params });
  return data;
}

// GET /api/v1/repairs/{id}.
export async function fetchRepair(id: string): Promise<RepairDetail> {
  const { data } = await apiClient.get<{ data: RepairDetail }>(`/repairs/${id}`);
  return data.data;
}

// POST /api/v1/repairs (API Spec Chapter 41.1).
export async function createRepair(input: CreateRepairInput): Promise<RepairDetail> {
  const { data } = await apiClient.post<{ data: RepairDetail }>("/repairs", input);
  return data.data;
}

// PATCH /api/v1/repairs/{id}/status (API Spec Chapter 41.2).
export async function updateRepairStatus(id: string, status: RepairStatus): Promise<RepairDetail> {
  const { data } = await apiClient.patch<{ data: RepairDetail }>(`/repairs/${id}/status`, { status });
  return data.data;
}

// PATCH /api/v1/repairs/{id}.
export async function updateRepair(id: string, input: UpdateRepairInput): Promise<RepairDetail> {
  const { data } = await apiClient.patch<{ data: RepairDetail }>(`/repairs/${id}`, input);
  return data.data;
}

// POST /api/v1/repairs/{id}/items — "Record Parts Used".
export async function addRepairItem(
  id: string,
  input: { productId: string; quantity: number; unitPrice: number },
): Promise<RepairDetail> {
  const { data } = await apiClient.post<{ data: RepairDetail }>(`/repairs/${id}/items`, input);
  return data.data;
}
