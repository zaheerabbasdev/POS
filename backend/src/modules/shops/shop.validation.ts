import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

export const listShopsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED", "CANCELLED"]).optional(),
});

export const shopIdParamSchema = z.object({
  id: z.string().uuid("Invalid shop id."),
});

// Reuses the same shop/owner shape as registration.validation.ts's
// registerShopSchema — deliberately not imported from there (that schema is
// specific to the public self-registration route's module) but kept in sync
// by hand; both ultimately feed the same common/services/provisionShop.ts.
export const createShopSchema = z.object({
  shop: z.object({
    name: z.string().trim().min(1, "Shop name is required."),
    phone: z.string().trim().min(1, "Shop phone is required."),
    email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
  }),
  owner: z.object({
    name: z.string().trim().min(1, "Owner name is required."),
    username: z.string().trim().min(3, "Username must be at least 3 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Temporary password must be at least 8 characters."),
  }),
});

export const updateShopSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });

export const extendTrialSchema = z.object({
  days: z.coerce.number().int().positive("Extension days must be positive."),
  reason: z.string().trim().min(1, "A reason is required."),
});
