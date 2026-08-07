import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/warranties (API Spec Chapter 42.1).
export const listWarrantiesQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CLAIMED", "CANCELLED"]).optional(),
  expiringWithinDays: z.coerce.number().int().positive().optional(),
});

// POST /api/v1/warranties/claim (API Spec Chapter 42.2).
export const createWarrantyClaimSchema = z.object({
  warrantyId: z.string().uuid("A valid warrantyId is required."),
  issue: z.string().trim().min(1, "Describe the issue."),
});
