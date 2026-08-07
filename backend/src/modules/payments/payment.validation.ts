import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";
import { PAYMENT_METHOD_INPUT_VALUES } from "../../common/utils/paymentMethod.js";

// GET /api/v1/payments (API Spec Chapter 36.1). "customer" = payments
// received against sales; "supplier" = payments made against purchases.
export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  type: z.enum(["customer", "supplier"]).optional(),
  method: z.enum(PAYMENT_METHOD_INPUT_VALUES).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const referenceIdParamSchema = z.object({
  id: z.string().uuid("Invalid reference id."),
});

// POST /api/v1/payments (API Spec Chapter 36.2).
export const createPaymentSchema = z.object({
  type: z.enum(["customer", "supplier"]),
  referenceId: z.string().uuid("A valid referenceId is required."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  method: z.enum(PAYMENT_METHOD_INPUT_VALUES),
  notes: z.string().trim().optional(),
});
