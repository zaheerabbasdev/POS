"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Stack,
  Card,
  Text,
  Button,
  TextInput,
  Alert,
  Anchor,
} from "@mantine/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";
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
    <Card shadow="sm" radius="md" withBorder p="xl" w="100%" maw={400}>
      <Stack gap="md">
        <Stack gap={0}>
          <Text fw={700} size="xl">Forgot password</Text>
          <Text size="sm" c="dimmed">Enter your account email and a reset link will be sent to you.</Text>
        </Stack>

        {submitted ? (
          <Alert icon={<CheckCircle2 size={16} />} color="teal" variant="light">
            If an account with that email exists, a password reset link has been sent. It expires in 1 hour.
          </Alert>
        ) : (
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

              <TextInput
                label="Email"
                type="email"
                autoComplete="email"
                autoFocus
                {...register("email")}
                error={errors.email?.message}
              />

              <Button type="submit" color="indigo" fullWidth disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                Send reset link
              </Button>
            </Stack>
          </form>
        )}

        <Text size="sm" ta="center" c="dimmed" mt="xs">
          <Anchor component={Link} href="/login" c="dimmed">
            Back to sign in
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );
}
