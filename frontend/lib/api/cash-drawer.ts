import { apiClient } from "../api-client";

export interface CashDrawer {
  id: string;
  cashierId: string;
  cashier: string;
  openingBalance: string;
  closingBalance: string | null;
  expectedBalance: string | null;
  difference: string | null;
  openedAt: string;
  closedAt: string | null;
  status: "OPEN" | "CLOSED";
}

export interface CashDrawerSummary {
  drawerId: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  salesCash: number;
  cashIn: number;
  refunds: number;
  expenses: number;
  cashOut: number;
  expectedClosingCash: number;
  closingCash: number | null;
  difference: number | null;
  transactions: {
    id: string;
    type: string;
    amount: string;
    referenceNumber: string | null;
    remarks: string | null;
    createdAt: string;
  }[];
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// GET /api/v1/cash-drawer/current
export async function fetchCurrentDrawer(): Promise<CashDrawer | null> {
  const { data } = await apiClient.get<{ data: CashDrawer | null }>("/cash-drawer/current");
  return data.data;
}

// GET /api/v1/cash-drawer/summary (API Spec Chapter 37.3).
export async function fetchDrawerSummary(drawerId?: string): Promise<CashDrawerSummary> {
  const { data } = await apiClient.get<{ data: CashDrawerSummary }>("/cash-drawer/summary", {
    params: drawerId ? { drawerId } : undefined,
  });
  return data.data;
}

// GET /api/v1/cash-drawer — session history.
export async function fetchDrawerHistory(params: { page?: number; limit?: number } = {}): Promise<Paginated<CashDrawer>> {
  const { data } = await apiClient.get<Paginated<CashDrawer>>("/cash-drawer", { params });
  return data;
}

// POST /api/v1/cash-drawer/open (API Spec Chapter 37.1).
export async function openDrawer(openingBalance: number): Promise<CashDrawer> {
  const { data } = await apiClient.post<{ data: CashDrawer }>("/cash-drawer/open", { openingBalance });
  return data.data;
}

// POST /api/v1/cash-drawer/close (API Spec Chapter 37.2).
export async function closeDrawer(closingBalance: number, notes?: string): Promise<CashDrawer> {
  const { data } = await apiClient.post<{ data: CashDrawer }>("/cash-drawer/close", { closingBalance, notes });
  return data.data;
}

// POST /api/v1/cash-drawer/cash-in
export async function cashIn(amount: number, remarks?: string): Promise<CashDrawer> {
  const { data } = await apiClient.post<{ data: CashDrawer }>("/cash-drawer/cash-in", { amount, remarks });
  return data.data;
}

// POST /api/v1/cash-drawer/cash-out
export async function cashOut(amount: number, remarks?: string): Promise<CashDrawer> {
  const { data } = await apiClient.post<{ data: CashDrawer }>("/cash-drawer/cash-out", { amount, remarks });
  return data.data;
}
