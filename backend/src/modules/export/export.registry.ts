import * as reportService from "../reports/report.service.js";

export interface ExportColumn {
  key: string;
  label: string;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface ReportDefinition {
  title: string;
  // Single-object reports (a summary, not a list of rows) get transposed to
  // one "Metric / Value" row per field instead of a one-row wide table —
  // reads far better in a PDF/Excel/CSV export than one giant row.
  isSummary: boolean;
  columns: ExportColumn[];
  fetch: (filters: ReportFilters) => Promise<unknown>;
}

// Keyed by the same path each report already answers to under
// /api/v1/reports/* (API Spec Chapters 45–50) — one registry entry per
// report this system can produce, so Export (Chapter 51) never drifts out
// of sync with what Reports actually returns.
export const REPORT_REGISTRY: Record<string, ReportDefinition> = {
  "sales/summary": {
    title: "Sales Summary",
    isSummary: true,
    columns: [
      { key: "totalSales", label: "Total Sales" },
      { key: "totalInvoices", label: "Total Invoices" },
      { key: "averageSale", label: "Average Sale" },
    ],
    fetch: (f) => reportService.getSalesSummary(f),
  },
  "sales/daily": {
    title: "Daily Sales Report",
    isSummary: false,
    columns: [
      { key: "date", label: "Date" },
      { key: "invoices", label: "Invoices" },
      { key: "totalSales", label: "Total Sales" },
      { key: "cashSales", label: "Cash Sales" },
      { key: "creditSales", label: "Credit Sales" },
    ],
    fetch: (f) => reportService.getDailySalesReport(f),
  },
  "sales/products": {
    title: "Product Sales Report",
    isSummary: false,
    columns: [
      { key: "productName", label: "Product" },
      { key: "quantitySold", label: "Qty Sold" },
      { key: "revenue", label: "Revenue" },
      { key: "profit", label: "Profit" },
    ],
    fetch: (f) => reportService.getProductSalesReport(f),
  },
  "sales/employees": {
    title: "Employee Sales Report",
    isSummary: false,
    columns: [
      { key: "employeeName", label: "Employee" },
      { key: "totalSales", label: "Total Sales" },
      { key: "transactions", label: "Transactions" },
    ],
    fetch: (f) => reportService.getEmployeeSalesReport(f),
  },
  "purchases/summary": {
    title: "Purchase Summary",
    isSummary: true,
    columns: [
      { key: "totalPurchases", label: "Total Purchases" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "supplierCount", label: "Supplier Count" },
      { key: "pendingPayments", label: "Pending Payments" },
    ],
    fetch: (f) => reportService.getPurchaseSummary(f),
  },
  "purchases/suppliers": {
    title: "Supplier Purchase Report",
    isSummary: false,
    columns: [
      { key: "supplierName", label: "Supplier" },
      { key: "purchaseCount", label: "Purchase Count" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "outstandingBalance", label: "Outstanding Balance" },
    ],
    fetch: (f) => reportService.getSupplierPurchaseReport(f),
  },
  "inventory/stock": {
    title: "Stock Report",
    isSummary: false,
    columns: [
      { key: "sku", label: "SKU" },
      { key: "productName", label: "Product" },
      { key: "availableQuantity", label: "Available Qty" },
      { key: "purchasePrice", label: "Purchase Price" },
      { key: "stockValue", label: "Stock Value" },
    ],
    fetch: () => reportService.getStockReport(),
  },
  "inventory/low-stock": {
    title: "Low Stock Report",
    isSummary: false,
    columns: [
      { key: "sku", label: "SKU" },
      { key: "productName", label: "Product" },
      { key: "currentStock", label: "Current Stock" },
      { key: "reorderLevel", label: "Reorder Level" },
    ],
    fetch: () => reportService.getLowStockReport(),
  },
  "inventory/movement": {
    title: "Stock Movement Report",
    isSummary: false,
    columns: [
      { key: "date", label: "Date" },
      { key: "sku", label: "SKU" },
      { key: "productName", label: "Product" },
      { key: "type", label: "Type" },
      { key: "quantity", label: "Quantity" },
      { key: "referenceNumber", label: "Reference" },
    ],
    fetch: (f) => reportService.getStockMovementReport(f),
  },
  "inventory/imei": {
    title: "IMEI Report",
    isSummary: false,
    columns: [
      { key: "imei", label: "IMEI" },
      { key: "sku", label: "SKU" },
      { key: "productName", label: "Product" },
      { key: "purchaseDate", label: "Purchase Date" },
      { key: "saleStatus", label: "Sale Status" },
      { key: "warrantyStatus", label: "Warranty Status" },
    ],
    fetch: () => reportService.getImeiReport(),
  },
  "financial/profit-loss": {
    title: "Profit & Loss Report",
    isSummary: true,
    columns: [
      { key: "totalSales", label: "Total Sales" },
      { key: "costOfGoodsSold", label: "Cost of Goods Sold" },
      { key: "expenses", label: "Expenses" },
      { key: "netProfit", label: "Net Profit" },
    ],
    fetch: (f) => reportService.getProfitLossReport(f),
  },
  "financial/expenses": {
    title: "Expense Report",
    isSummary: false,
    columns: [
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Date" },
      { key: "employee", label: "Employee" },
    ],
    fetch: (f) => reportService.getExpenseReport(f),
  },
  "financial/cash-flow": {
    title: "Cash Flow Report",
    isSummary: true,
    columns: [
      { key: "cashIn", label: "Cash In" },
      { key: "cashOut", label: "Cash Out" },
      { key: "currentBalance", label: "Current Balance" },
    ],
    fetch: (f) => reportService.getCashFlowReport(f),
  },
  "customers/purchases": {
    title: "Customer Purchase Report",
    isSummary: false,
    columns: [
      { key: "customerName", label: "Customer" },
      { key: "totalPurchases", label: "Total Purchases" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "lastPurchaseDate", label: "Last Purchase" },
    ],
    fetch: (f) => reportService.getCustomerPurchaseReport(f),
  },
  "customers/balance": {
    title: "Customer Balance Report",
    isSummary: false,
    columns: [
      { key: "customerName", label: "Customer" },
      { key: "creditLimit", label: "Credit Limit" },
      { key: "paidAmount", label: "Paid Amount" },
      { key: "remainingBalance", label: "Remaining Balance" },
    ],
    fetch: () => reportService.getCustomerBalanceReport(),
  },
  "suppliers/balance": {
    title: "Supplier Balance Report",
    isSummary: false,
    columns: [
      { key: "supplierName", label: "Supplier" },
      { key: "totalPurchases", label: "Total Purchases" },
      { key: "paidAmount", label: "Paid Amount" },
      { key: "remainingAmount", label: "Remaining Amount" },
    ],
    fetch: () => reportService.getSupplierBalanceReport(),
  },
  "suppliers/payments": {
    title: "Supplier Payment History",
    isSummary: false,
    columns: [
      { key: "supplierName", label: "Supplier" },
      { key: "purchaseNumber", label: "Purchase #" },
      { key: "amount", label: "Amount" },
      { key: "method", label: "Method" },
      { key: "date", label: "Date" },
    ],
    fetch: (f) => reportService.getSupplierPaymentHistory(f),
  },
};

export type ReportType = keyof typeof REPORT_REGISTRY;
