import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/users query params (API Spec Chapter 21.1).
export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user id."),
});

// POST /api/v1/users (API Spec Chapter 21.3).
export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  username: z.string().trim().min(3, "Username must be at least 3 characters."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  roleId: z.string().uuid("A valid roleId is required."),
});

// PATCH /api/v1/users/{id} (API Spec Chapter 21.4).
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    roleId: z.string().uuid().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    profileImage: z.string().url().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
