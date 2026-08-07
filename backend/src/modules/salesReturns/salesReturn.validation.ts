import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";
import { PAYMENT_METHOD_INPUT_VALUES } from "../../common/utils/paymentMethod.js";

// GET /api/v1/sales-returns (API Spec Chapter 35.1).
export const listSalesReturnsQuerySchema = paginationQuerySchema.extend({
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const salesReturnItemSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().optional(),
});

// POST /api/v1/sales-returns (API Spec Chapter 35.2).
export const createSalesReturnSchema = z.object({
  saleId: z.string().uuid("A valid saleId is required."),
  items: z.array(salesReturnItemSchema).min(1, "At least one item is required."),
  refundMethod: z.enum(PAYMENT_METHOD_INPUT_VALUES),
});
