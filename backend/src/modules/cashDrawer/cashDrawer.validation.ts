import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// POST /api/v1/cash-drawer/open (API Spec Chapter 37.1).
export const openDrawerSchema = z.object({
  openingBalance: z.coerce.number().nonnegative(),
});

// POST /api/v1/cash-drawer/close (API Spec Chapter 37.2).
export const closeDrawerSchema = z.object({
  closingBalance: z.coerce.number().nonnegative(),
  notes: z.string().trim().optional(),
});

// POST /api/v1/cash-drawer/cash-in and /cash-out (DDD Module 18 features).
export const cashMovementSchema = z.object({
  amount: z.coerce.number().positive(),
  remarks: z.string().trim().optional(),
});

// GET /api/v1/cash-drawer/summary
export const summaryQuerySchema = z.object({
  drawerId: z.string().uuid().optional(),
});

// GET /api/v1/cash-drawer
export const listDrawersQuerySchema = paginationQuerySchema.extend({
  cashierId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
});
