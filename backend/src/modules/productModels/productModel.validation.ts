import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/models (API Spec Chapter 25.1). The doc's filter list also
// mentions "Category", but Product Models don't have a category (DDD Table
// 9 only gives them a brand) — categorization happens at the Product level.
export const listProductModelsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  brandId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const productModelIdParamSchema = z.object({
  id: z.string().uuid("Invalid model id."),
});

// POST /api/v1/models (API Spec Chapter 25.2).
export const createProductModelSchema = z.object({
  name: z.string().trim().min(1, "Model name is required."),
  brandId: z.string().uuid("A valid brandId is required."),
  releaseYear: z.coerce.number().int().min(1990).max(2100).optional(),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// PATCH /api/v1/models/{id} (API Spec Chapter 25.3).
export const updateProductModelSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    brandId: z.string().uuid().optional(),
    releaseYear: z.coerce.number().int().min(1990).max(2100).optional(),
    description: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
