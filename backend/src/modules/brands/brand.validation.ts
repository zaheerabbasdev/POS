import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/brands (API Spec Chapter 23.1).
export const listBrandsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const brandIdParamSchema = z.object({
  id: z.string().uuid("Invalid brand id."),
});

// POST /api/v1/brands (API Spec Chapter 23.2).
export const createBrandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required."),
  description: z.string().trim().optional(),
  logoUrl: z.string().trim().url().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// PATCH /api/v1/brands/{id} (API Spec Chapter 23.3).
export const updateBrandSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    logoUrl: z.string().trim().url().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
