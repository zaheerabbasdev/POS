import { z } from "zod";

export const planIdParamSchema = z.object({
  id: z.string().uuid("Invalid plan id."),
});

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required."),
  description: z.string().trim().optional(),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
  currency: z.string().trim().min(1).default("USD"),
  billingInterval: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  durationDays: z.coerce.number().int().nonnegative("Duration must be zero or more days."),
});

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    price: z.coerce.number().nonnegative().optional(),
    currency: z.string().trim().min(1).optional(),
    billingInterval: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]).optional(),
    durationDays: z.coerce.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
