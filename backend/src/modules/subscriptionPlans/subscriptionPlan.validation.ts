import { z } from "zod";

export const planIdParamSchema = z.object({
  id: z.string().uuid("Invalid plan id."),
});

// null = unlimited (matches the schema's own convention for these columns —
// see SubscriptionPlan.maxUsers/maxProducts in schema.prisma).
const limitField = z.union([z.coerce.number().int().positive("Must be a positive number."), z.null()]).optional();

export const createPlanSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required."),
  description: z.string().trim().optional(),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
  currency: z.string().trim().min(1).default("USD"),
  billingInterval: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  durationDays: z.coerce.number().int().nonnegative("Duration must be zero or more days."),
  maxUsers: limitField,
  maxProducts: limitField,
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
    maxUsers: limitField,
    maxProducts: limitField,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
