import { z } from "zod";

// Public shop-registration request shape (spec §14-16). Mirrors
// auth.validation.ts's style/rules where a field overlaps (username length,
// password policy) so the two never drift on what "valid" means.
export const registerShopSchema = z.object({
  shop: z.object({
    name: z.string().trim().min(1, "Shop name is required."),
    phone: z.string().trim().min(1, "Shop phone is required."),
    email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().optional(),
  }),
  owner: z
    .object({
      name: z.string().trim().min(1, "Owner name is required."),
      username: z.string().trim().min(3, "Username must be at least 3 characters."),
      email: z.string().trim().email("Enter a valid email address."),
      password: z.string().min(8, "Password must be at least 8 characters."),
      confirmPassword: z.string().min(1, "Please confirm your password."),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }),
});

export type RegisterShopBody = z.infer<typeof registerShopSchema>;
