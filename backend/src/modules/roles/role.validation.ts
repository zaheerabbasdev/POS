import { z } from "zod";

export const roleIdParamSchema = z.object({
  id: z.string().uuid("Invalid role id."),
});

// POST /api/v1/roles (API Spec Chapter 22.2).
export const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required."),
  description: z.string().trim().optional(),
});

// PATCH /api/v1/roles/{id} (API Spec Chapter 22.4).
export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });

// POST /api/v1/roles/{id}/permissions (API Spec Chapter 22.3) — replaces the
// role's full permission set with the given list.
export const assignPermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).min(1, "At least one permission code is required."),
});
