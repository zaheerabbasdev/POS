import { z } from "zod";

// Request shapes per API Specification Document, Chapters 11 & 14–15.
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(1, "Password is required."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email is required."),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
});
