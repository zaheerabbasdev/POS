"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgotPassword } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordValues) => forgotPassword(values.email),
    onSuccess: () => setSubmitted(true),
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Forgot password</CardTitle>
        <CardDescription>Enter your account email and a reset link will be sent to you.</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <Alert>
            <AlertDescription>
              If an account with that email exists, a password reset link has been sent. It expires in 1 hour.
            </AlertDescription>
          </Alert>
        ) : (
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
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
