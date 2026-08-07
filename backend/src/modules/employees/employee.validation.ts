import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/employees (API Spec Chapter 29.1).
export const listEmployeesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const employeeIdParamSchema = z.object({
  id: z.string().uuid("Invalid employee id."),
});

// POST /api/v1/employees (API Spec Chapter 29.2).
export const createEmployeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email().optional(),
  address: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  salary: z.coerce.number().nonnegative().optional(),
  joiningDate: z.coerce.date().optional(),
});

// PATCH /api/v1/employees/{id} (API Spec Chapter 29.3).
export const updateEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    phone: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    address: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    salary: z.coerce.number().nonnegative().optional(),
    joiningDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
