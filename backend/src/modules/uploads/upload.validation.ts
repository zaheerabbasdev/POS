import { z } from "zod";

// POST /api/v1/uploads/image (API Spec Chapter 52.1).
export const uploadImageBodySchema = z.object({
  type: z.enum(["product", "employee", "customer", "repair", "logo"]),
  entityId: z.string().uuid().optional(),
});

// DELETE /api/v1/uploads/image/{id} (API Spec Chapter 52.2).
export const imageIdParamSchema = z.object({
  id: z.string().trim().min(1, "Invalid image id."),
});
