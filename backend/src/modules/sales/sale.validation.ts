import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";
import { PAYMENT_METHOD_INPUT_VALUES } from "../../common/utils/paymentMethod.js";

// GET /api/v1/sales (API Spec Chapter 34.1).
export const listSalesQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  status: z.enum(["PAID", "PARTIAL", "UNPAID"]).optional(),
  invoiceNumber: z.string().trim().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const saleIdParamSchema = z.object({
  id: z.string().uuid("Invalid sale id."),
});

const saleItemSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  quantity: z.coerce.number().int().positive().default(1),
  price: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().optional(),
  tax: z.coerce.number().nonnegative().optional(),
  // Singular per API Spec 34.3 — IMEI-tracked items are always quantity 1
  // (DDD Table 22 note on sale_items).
  imei: z.string().trim().optional(),
});

// A sale can be paid with more than one method in one go (e.g. part cash,
// part card) — each entry becomes its own Payment record, so payment
// history/reports stay accurate about how much came in through which method.
const salePaymentSchema = z.object({
  method: z.enum(PAYMENT_METHOD_INPUT_VALUES),
  paidAmount: z.coerce.number().positive(),
});

// POST /api/v1/sales (API Spec Chapter 34.3).
export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required."),
  discount: z.coerce.number().nonnegative().optional(),
  payments: z.array(salePaymentSchema).optional(),
  remarks: z.string().trim().optional(),
});

// PATCH /api/v1/sales/{id}/cancel (API Spec Chapter 34.4).
export const cancelSaleSchema = z
  .object({
    reason: z.string().trim().optional(),
  })
  .optional();
