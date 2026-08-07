"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { resetPassword } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) => resetPassword(token ?? "", values.newPassword),
    onSuccess: () => {
      toast.success("Password reset. Sign in with your new password.");
      router.push("/login");
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Invalid reset link</CardTitle>
          <CardDescription>This link is missing its token. Request a new one from the forgot password page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            mutation.mutate(values);
          })}
          noValidate
        >
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-new-password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="reset-new-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              aria-invalid={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
            {errors.newPassword ? <p className="text-sm text-destructive">{errors.newPassword.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-confirm-password" className="text-sm font-medium">
              Confirm new password
            </label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? <p className="text-sm text-destructive">{errors.confirmPassword.message}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Resetting..." : "Reset password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
