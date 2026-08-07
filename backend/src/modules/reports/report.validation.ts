import { z } from "zod";

const dateRangeSchema = {
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
};

// GET /api/v1/reports/sales/summary (45.1).
export const salesSummaryQuerySchema = z.object({
  ...dateRangeSchema,
  employeeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  paymentStatus: z.enum(["PAID", "PARTIAL", "UNPAID"]).optional(),
});

// GET /api/v1/reports/sales/daily, /sales/products, /sales/employees,
// /purchases/summary, /purchases/suppliers, /financial/profit-loss,
// /financial/expenses, /financial/cash-flow, /customers/purchases,
// /suppliers/payments — all take just a date range.
export const dateRangeQuerySchema = z.object(dateRangeSchema);

// GET /api/v1/reports/inventory/movement (47.3).
export const stockMovementQuerySchema = z.object({
  ...dateRangeSchema,
  productId: z.string().uuid().optional(),
});

// GET /api/v1/reports/inventory/imei (47.4).
export const imeiReportQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  status: z.enum(["AVAILABLE", "RESERVED", "SOLD", "RETURNED", "UNDER_REPAIR", "REPLACED"]).optional(),
});
