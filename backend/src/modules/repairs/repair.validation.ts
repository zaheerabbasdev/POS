import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

const repairStatusEnum = z.enum([
  "RECEIVED",
  "UNDER_INSPECTION",
  "WAITING_FOR_PARTS",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

// GET /api/v1/repairs.
export const listRepairsQuerySchema = paginationQuerySchema.extend({
  customerId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  status: repairStatusEnum.optional(),
});

export const repairIdParamSchema = z.object({
  id: z.string().uuid("Invalid repair id."),
});

// POST /api/v1/repairs (API Spec Chapter 41.1).
export const createRepairSchema = z.object({
  customerId: z.string().uuid("A valid customerId is required."),
  device: z.string().trim().optional(),
  productId: z.string().uuid().optional(),
  imei: z.string().trim().optional(),
  problem: z.string().trim().min(1, "Problem description is required."),
  technicianId: z.string().uuid().optional(),
  estimatedCost: z.coerce.number().nonnegative().optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
});

// PATCH /api/v1/repairs/{id}/status (API Spec Chapter 41.2).
export const updateRepairStatusSchema = z.object({
  status: repairStatusEnum,
});

// PATCH /api/v1/repairs/{id}.
export const updateRepairSchema = z
  .object({
    diagnosis: z.string().trim().optional(),
    technicianId: z.string().uuid().optional(),
    estimatedCost: z.coerce.number().nonnegative().optional(),
    actualCost: z.coerce.number().nonnegative().optional(),
    expectedDeliveryDate: z.coerce.date().optional(),
    remarks: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });

// POST /api/v1/repairs/{id}/items — "Record Parts Used".
export const addRepairItemSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});
