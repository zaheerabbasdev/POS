import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/purchase-returns (API Spec Chapter 33.1).
export const listPurchaseReturnsQuerySchema = paginationQuerySchema.extend({
  purchaseId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const purchaseReturnItemSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().trim().optional(),
});

// POST /api/v1/purchase-returns (API Spec Chapter 33.2).
export const createPurchaseReturnSchema = z.object({
  purchaseId: z.string().uuid("A valid purchaseId is required."),
  supplierId: z.string().uuid("A valid supplierId is required."),
  items: z.array(purchaseReturnItemSchema).min(1, "At least one item is required."),
  refundAmount: z.coerce.number().nonnegative().optional(),
});
