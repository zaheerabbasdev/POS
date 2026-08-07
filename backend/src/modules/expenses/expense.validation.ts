import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";
import { PAYMENT_METHOD_INPUT_VALUES } from "../../common/utils/paymentMethod.js";

// GET /api/v1/expenses (API Spec Chapter 43.1).
export const listExpensesQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const expenseIdParamSchema = z.object({
  id: z.string().uuid("Invalid expense id."),
});

// POST /api/v1/expenses (API Spec Chapter 43.2).
export const createExpenseSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHOD_INPUT_VALUES).optional(),
  expenseDate: z.coerce.date().optional(),
  description: z.string().trim().optional(),
});

// PATCH /api/v1/expenses/{id}.
export const updateExpenseSchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_INPUT_VALUES).optional(),
    expenseDate: z.coerce.date().optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
