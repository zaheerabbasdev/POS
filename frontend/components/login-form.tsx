"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Paper,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Alert,
  Anchor,
  Box,
  ThemeIcon,
  Group,
} from "@mantine/core";
import { Store, AlertCircle } from "lucide-react";
import { login, logout } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";
import { currentUserQueryKey } from "@/hooks/use-current-user";

// Zod schema — unchanged from original
const loginFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  variant?: "shop" | "platform";
}

export function LoginForm({ variant = "shop" }: LoginFormProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryClient  = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  // Mutation is identical to original — same API call, same routing logic
  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => login(values.username, values.password),
    onSuccess: async (user) => {
      const isPlatformAdmin = user.shopId === null;
      if ((variant === "platform") !== isPlatformAdmin) {
        await logout();
        setFormError(
          variant === "platform"
            ? "This is a shop account, not a platform admin account. Sign in at the regular login page instead."
            : "This is an admin account. Sign in at the platform admin login page instead.",
        );
        return;
      }

      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      toast.success(`Welcome back, ${user.name}.`);
      if (isPlatformAdmin) {
        router.push("/admin/dashboard");
      } else {
        const next = searchParams.get("next");
        router.push(next && next.startsWith("/") ? next : "/dashboard");
      }
      router.refresh();
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error));
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setFormError(null);
    loginMutation.mutate(values);
  };

  const isPlatform = variant === "platform";

  return (
    <Box style={{ width: "100%", maxWidth: 400 }}>
      <Paper withBorder shadow="sm" radius="lg" p="xl">
        <Stack gap="md">
          {/* Brand header */}
          <Group gap="md" mb="xs">
            <ThemeIcon
              size={48}
              radius="md"
              style={{
                backgroundColor: isPlatform
                  ? "var(--mantine-color-violet-6)"
                  : "var(--mantine-color-indigo-6)",
                color: "white",
                border: "none",
              }}
            >
              <Store size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="lg" lh={1.2}>
                {isPlatform ? "Platform Admin" : "Mobile Shop POS"}
              </Text>
              <Text size="xs" c="dimmed">
                Sign in to your account
              </Text>
            </Box>
          </Group>

          {/* Error alert */}
          {formError && (
            <Alert
              icon={<AlertCircle size={16} />}
              color="red"
              variant="light"
              radius="sm"
            >
              {formError}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack gap="sm">
              <TextInput
                id="username"
                label="Username"
                autoComplete="username"
                autoFocus
                error={errors.username?.message}
                {...register("username")}
              />

              <Box>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500}>
                    Password
                  </Text>
                  {!isPlatform && (
                    <Anchor
                      component={Link}
                      href="/forgot-password"
                      size="xs"
                      c="dimmed"
                    >
                      Forgot password?
                    </Anchor>
                  )}
                </Group>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register("password")}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                mt="xs"
                loading={loginMutation.isPending}
                disabled={isSubmitting}
                color={isPlatform ? "violet" : "indigo"}
              >
                Sign in
              </Button>
            </Stack>
          </form>

          {/* Register link */}
          {variant === "shop" && (
            <Text size="sm" ta="center" c="dimmed" mt="xs">
              Don&apos;t have an account?{" "}
              <Anchor component={Link} href="/register" fw={500}>
                Register Shop
              </Anchor>
            </Text>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
