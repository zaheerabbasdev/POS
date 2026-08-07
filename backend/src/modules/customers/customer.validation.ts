import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/customers (API Spec Chapter 27.1) — search covers Name, Phone, Customer Code.
export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  customerType: z.enum(["REGULAR", "WHOLESALE", "VIP", "CORPORATE"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const customerIdParamSchema = z.object({
  id: z.string().uuid("Invalid customer id."),
});

// POST /api/v1/customers (API Spec Chapter 27.2). The DDD splits first/last
// name (Table 16); the API contract sends one "name" field, same bridge
// used for Users (modules/users/user.service.ts).
export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  customerType: z.enum(["REGULAR", "WHOLESALE", "VIP", "CORPORATE"]).optional(),
  creditLimit: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    customerType: z.enum(["REGULAR", "WHOLESALE", "VIP", "CORPORATE"]).optional(),
    creditLimit: z.coerce.number().nonnegative().optional(),
    notes: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
