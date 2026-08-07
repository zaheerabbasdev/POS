import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/categories (API Spec Chapter 24.1).
export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid category id."),
});

// POST /api/v1/categories (API Spec Chapter 24.2).
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// PATCH /api/v1/categories/{id} (API Spec Chapter 24.3).
export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
