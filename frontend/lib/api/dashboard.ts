import { apiClient } from "../api-client";

export interface DashboardSummary {
  todaySales: string;
  todayPurchases: string;
  monthlySales: string;
  totalRevenue: string;
  totalExpenses: number;
  totalProfit: string;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  pendingPayments: number;
  pendingRepairs: number;
  totalRepairs: number;
  completedRepairs: number;
  totalWarranties: number;
  activeWarranties: number;
  expiringWarranties: number;
  monthlyExpenses: number;
  monthlyPayments: string;
  openCashDrawers: number;
  customersServed: number;
  recentRepairs: {
    id: string;
    repairTicketNumber: string;
    customer: string;
    status: string;
    date: string;
  }[];
  recentSales: {
    id: string;
    invoiceNumber: string;
    customer: string;
    totalAmount: string;
    status: string;
    date: string;
  }[];
  recentPurchases: {
    id: string;
    purchaseNumber: string;
    supplier: string;
    totalAmount: string;
    status: string;
    date: string;
  }[];
}

// GET /api/v1/dashboard/summary (API Spec Chapter 44.1).
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<{ data: DashboardSummary }>("/dashboard/summary");
  return data.data;
}
