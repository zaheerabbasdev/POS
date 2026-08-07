import { apiClient } from "../api-client";

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

async function get<T>(path: string, params?: object): Promise<T> {
  const { data } = await apiClient.get<{ data: T }>(`/reports/${path}`, { params });
  return data.data;
}

// --- Chapter 45 – Sales Reports ---
export interface SalesSummary {
  totalSales: number;
  totalInvoices: number;
  averageSale: number;
}
export const fetchSalesSummary = (params: DateRangeParams & { employeeId?: string; customerId?: string; paymentStatus?: string } = {}) =>
  get<SalesSummary>("sales/summary", params);

export interface DailySalesRow {
  date: string;
  invoices: number;
  totalSales: number;
  cashSales: number;
  creditSales: number;
}
export const fetchDailySales = (params: DateRangeParams = {}) => get<DailySalesRow[]>("sales/daily", params);

export interface ProductSalesRow {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}
export const fetchProductSales = (params: DateRangeParams = {}) => get<ProductSalesRow[]>("sales/products", params);

export interface EmployeeSalesRow {
  employeeId: string;
  employeeName: string;
  totalSales: number;
  transactions: number;
}
export const fetchEmployeeSales = (params: DateRangeParams = {}) => get<EmployeeSalesRow[]>("sales/employees", params);

// --- Chapter 46 – Purchase Reports ---
export interface PurchaseSummary {
  totalPurchases: number;
  totalAmount: number;
  supplierCount: number;
  pendingPayments: number;
}
export const fetchPurchaseSummary = (params: DateRangeParams = {}) => get<PurchaseSummary>("purchases/summary", params);

export interface SupplierPurchaseRow {
  supplierId: string;
  supplierName: string;
  purchaseCount: number;
  totalAmount: number;
  outstandingBalance: number;
}
export const fetchSupplierPurchases = (params: DateRangeParams = {}) => get<SupplierPurchaseRow[]>("purchases/suppliers", params);

// --- Chapter 47 – Inventory Reports ---
export interface StockRow {
  productId: string;
  sku: string;
  productName: string;
  availableQuantity: number;
  purchasePrice: string;
  stockValue: number;
}
export const fetchStockReport = () => get<StockRow[]>("inventory/stock");

export interface LowStockRow {
  productId: string;
  sku: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
}
export const fetchLowStockReport = () => get<LowStockRow[]>("inventory/low-stock");

export interface StockMovementRow {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: string;
  quantity: number;
  referenceNumber: string | null;
  date: string;
}
export const fetchStockMovement = (params: DateRangeParams & { productId?: string } = {}) =>
  get<StockMovementRow[]>("inventory/movement", params);

export interface ImeiReportRow {
  imei: string;
  productId: string;
  sku: string;
  productName: string;
  purchaseDate: string | null;
  saleStatus: string;
  warrantyStatus: string | null;
}
export const fetchImeiReport = (params: { productId?: string; status?: string } = {}) => get<ImeiReportRow[]>("inventory/imei", params);

// --- Chapter 48 – Financial Reports ---
export interface ProfitLossReport {
  totalSales: number;
  costOfGoodsSold: number;
  expenses: number;
  netProfit: number;
}
export const fetchProfitLoss = (params: DateRangeParams = {}) => get<ProfitLossReport>("financial/profit-loss", params);

export interface FinancialExpenseRow {
  id: string;
  category: string;
  amount: string;
  date: string;
  employee: string | null;
}
export const fetchFinancialExpenses = (params: DateRangeParams = {}) => get<FinancialExpenseRow[]>("financial/expenses", params);

export interface CashFlowReport {
  cashIn: number;
  cashOut: number;
  currentBalance: number;
}
export const fetchCashFlow = (params: DateRangeParams = {}) => get<CashFlowReport>("financial/cash-flow", params);

// --- Chapter 49 – Customer Reports ---
export interface CustomerPurchaseRow {
  customerId: string;
  customerName: string;
  totalPurchases: number;
  totalAmount: number;
  lastPurchaseDate: string;
}
export const fetchCustomerPurchases = (params: DateRangeParams = {}) => get<CustomerPurchaseRow[]>("customers/purchases", params);

export interface CustomerBalanceRow {
  customerId: string;
  customerName: string;
  creditLimit: string;
  paidAmount: number;
  remainingBalance: string;
}
export const fetchCustomerBalance = () => get<CustomerBalanceRow[]>("customers/balance");

// --- Chapter 50 – Supplier Reports ---
export interface SupplierBalanceRow {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  paidAmount: number;
  remainingAmount: string;
}
export const fetchSupplierBalance = () => get<SupplierBalanceRow[]>("suppliers/balance");

export interface SupplierPaymentRow {
  supplierId: string;
  supplierName: string;
  purchaseNumber: string;
  amount: string;
  method: string;
  date: string;
}
export const fetchSupplierPayments = (params: DateRangeParams = {}) => get<SupplierPaymentRow[]>("suppliers/payments", params);
