import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/products (API Spec Chapter 26.1). "IMEI" is listed as a
// filter in the doc but is really a lookup (find the one product that owns
// that IMEI) rather than a list filter — that's what IMEI Tracking APIs
// (Chapter 40, not yet built) are for.
export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  stockStatus: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product id."),
});

// POST /api/v1/products (API Spec Chapter 26.3). The doc's example body
// doesn't include "sku", but the DDD requires it (unique, NOT NULL) — it's
// auto-generated server-side when omitted.
export const createProductSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  sku: z.string().trim().min(1).optional(),
  categoryId: z.string().uuid("A valid categoryId is required."),
  brandId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  purchasePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  wholesalePrice: z.coerce.number().nonnegative().optional(),
  taxPercentage: z.coerce.number().min(0).max(100).optional(),
  warrantyMonths: z.coerce.number().int().nonnegative().optional(),
  barcode: z.string().trim().optional(),
  description: z.string().trim().optional(),
  // Opening stock — creates the linked Inventory row (SRS Module 9).
  stock: z.coerce.number().int().nonnegative().optional(),
  reorderLevel: z.coerce.number().int().nonnegative().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  // Not in the API Spec's example body — drives IMEI validation in
  // Purchases/Sales (Phase 4). Defaults false (accessory-like).
  tracksImei: z.coerce.boolean().optional(),
});

// PATCH /api/v1/products/{id} (API Spec Chapter 26.5). SKU is immutable
// after creation; ongoing stock changes go through the Inventory module,
// not this endpoint — "stock" is deliberately not updatable here.
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    purchasePrice: z.coerce.number().nonnegative().optional(),
    sellingPrice: z.coerce.number().nonnegative().optional(),
    wholesalePrice: z.coerce.number().nonnegative().optional(),
    taxPercentage: z.coerce.number().min(0).max(100).optional(),
    warrantyMonths: z.coerce.number().int().nonnegative().optional(),
    barcode: z.string().trim().optional(),
    description: z.string().trim().optional(),
    reorderLevel: z.coerce.number().int().nonnegative().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    tracksImei: z.coerce.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
