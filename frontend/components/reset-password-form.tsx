"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Stack,
  Card,
  Text,
  Button,
  PasswordInput,
  Alert,
  Anchor,
} from "@mantine/core";
import { AlertCircle } from "lucide-react";
import { resetPassword } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
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
    defaultValues: { password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordValues) => {
      if (!token) throw new Error("Missing reset token.");
      return resetPassword(token, values.password);
    },
    onSuccess: () => {
      toast.success("Password reset successfully. Please sign in.");
      router.push("/login");
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  if (!token) {
    return (
      <Card shadow="sm" radius="md" withBorder p="xl" w="100%" maw={400}>
        <Stack gap="md">
          <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
            Invalid or missing reset link.
          </Alert>
          <Button component={Link} href="/login" color="indigo" fullWidth>
            Return to sign in
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder p="xl" w="100%" maw={400}>
      <Stack gap="md">
        <Stack gap={0}>
          <Text fw={700} size="xl">Reset password</Text>
          <Text size="sm" c="dimmed">Enter a new password for your account.</Text>
        </Stack>

        <form
          onSubmit={handleSubmit((values) => {
            setFormError(null);
            mutation.mutate(values);
          })}
          noValidate
        >
          <Stack gap="lg">
            {formError && (
              <Alert icon={<AlertCircle size={16} />} color="red" variant="light">
                {formError}
              </Alert>
            )}

            <PasswordInput
              label="New password"
              autoComplete="new-password"
              autoFocus
              {...register("password")}
              error={errors.password?.message}
            />
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" color="indigo" fullWidth disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
              Reset password
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center" c="dimmed" mt="xs">
          <Anchor component={Link} href="/login" c="dimmed">
            Cancel and return to sign in
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );
}
