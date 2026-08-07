import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/suppliers (API Spec Chapter 28.1).
export const listSuppliersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const supplierIdParamSchema = z.object({
  id: z.string().uuid("Invalid supplier id."),
});

// POST /api/v1/suppliers (API Spec Chapter 28.2).
export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  contactPerson: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
});

export const updateSupplierSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
    contactPerson: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
    taxNumber: z.string().trim().optional(),
    paymentTerms: z.string().trim().optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
