import { z } from "zod";

// PATCH /api/v1/settings (API Spec Chapter 30.2).
export const updateSettingsSchema = z
  .object({
    shop_name: z.string().trim().optional(),
    shop_address: z.string().trim().optional(),
    shop_phone: z.string().trim().optional(),
    shop_email: z.string().trim().email().or(z.literal("")).optional(),
    shop_logo: z.string().trim().optional(),
    currency: z.string().trim().optional(),
    timezone: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
