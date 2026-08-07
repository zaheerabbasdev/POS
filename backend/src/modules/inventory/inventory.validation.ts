import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/inventory (API Spec Chapter 38.1).
export const listInventoryQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
});

// GET /api/v1/inventory/{productId}/history (API Spec Chapter 38.2).
export const productIdParamSchema = z.object({
  productId: z.string().uuid("Invalid product id."),
});

// POST /api/v1/inventory/adjustment (API Spec Chapter 39.1).
export const createAdjustmentSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  type: z.enum(["increase", "decrease"]),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero."),
  reason: z.string().trim().min(1, "A reason is required."),
});
