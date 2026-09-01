"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stack,
  SimpleGrid,
  TextInput,
  PasswordInput,
  Button,
  Card,
  Text,
  Alert,
  Anchor,
  Group,
} from "@mantine/core";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { registerShop } from "@/lib/api/registration";
import { getApiErrorMessage } from "@/lib/api-client";
import { currentUserQueryKey } from "@/hooks/use-current-user";

// Mirrors the backend's registerShopSchema (modules/registration/registration.validation.ts).
const registerShopFormSchema = z
  .object({
    shopName: z.string().trim().min(1, "Shop name is required."),
    shopPhone: z.string().trim().min(1, "Shop phone is required."),
    shopEmail: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
    shopAddress: z.string().trim().optional(),
    shopCity: z.string().trim().optional(),
    shopCountry: z.string().trim().optional(),
    ownerName: z.string().trim().min(1, "Owner name is required."),
    username: z.string().trim().min(3, "Username must be at least 3 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RegisterShopFormValues = z.infer<typeof registerShopFormSchema>;

export function RegisterShopForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterShopFormValues>({
    resolver: zodResolver(registerShopFormSchema),
    defaultValues: {
      shopName: "",
      shopPhone: "",
      shopEmail: "",
      shopAddress: "",
      shopCity: "",
      shopCountry: "",
      ownerName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RegisterShopFormValues) =>
      registerShop({
        shop: {
          name: values.shopName,
          phone: values.shopPhone,
          ...(values.shopEmail ? { email: values.shopEmail } : {}),
          ...(values.shopAddress ? { address: values.shopAddress } : {}),
          ...(values.shopCity ? { city: values.shopCity } : {}),
          ...(values.shopCountry ? { country: values.shopCountry } : {}),
        },
        owner: {
          name: values.ownerName,
          username: values.username,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
        },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      setTrialEndDate(result.trial.endDate);
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error));
    },
  });

  if (mutation.isSuccess) {
    return (
      <Card shadow="sm" radius="md" withBorder p="xl" w="100%" maw={400}>
        <Stack gap="md">
          <Stack gap={0}>
            <Text fw={700} size="xl">You&apos;re all set 🎉</Text>
            <Text size="sm" c="dimmed">Your shop has been registered.</Text>
          </Stack>
          
          <Alert icon={<CheckCircle2 size={16} />} color="teal" variant="light">
            Your 1-month free trial is active — no payment required.
            {trialEndDate ? ` It runs until ${new Date(trialEndDate).toLocaleDateString()}.` : null}
          </Alert>

          <Button
            color="indigo"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Continue to POS
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" radius="md" withBorder p="xl" w="100%" maw={600}>
      <Stack gap="md">
        <Stack gap={0}>
          <Text fw={700} size="xl">Register your shop</Text>
          <Text size="sm" c="dimmed">Set up your shop and start a 1-month free trial — no payment required.</Text>
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

            <Stack gap="sm">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">Shop information</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Shop name"
                  autoFocus
                  {...register("shopName")}
                  error={errors.shopName?.message}
                />
                <TextInput
                  label="Phone"
                  autoComplete="tel"
                  {...register("shopPhone")}
                  error={errors.shopPhone?.message}
                />
                <TextInput
                  label="Email (optional)"
                  type="email"
                  {...register("shopEmail")}
                  error={errors.shopEmail?.message}
                />
                <TextInput
                  label="City (optional)"
                  {...register("shopCity")}
                  error={errors.shopCity?.message}
                />
                <TextInput
                  label="Country (optional)"
                  {...register("shopCountry")}
                  error={errors.shopCountry?.message}
                />
                <TextInput
                  label="Address (optional)"
                  {...register("shopAddress")}
                  error={errors.shopAddress?.message}
                />
              </SimpleGrid>
            </Stack>

            <Stack gap="sm">
              <Text size="sm" fw={600} c="dimmed" tt="uppercase">Owner login information</Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label="Owner name"
                  {...register("ownerName")}
                  error={errors.ownerName?.message}
                />
                <TextInput
                  label="Username"
                  autoComplete="username"
                  {...register("username")}
                  error={errors.username?.message}
                />
                <TextInput
                  label="Email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  error={errors.email?.message}
                />
                <div />
                <PasswordInput
                  label="Password"
                  autoComplete="new-password"
                  {...register("password")}
                  error={errors.password?.message}
                />
                <PasswordInput
                  label="Confirm password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                />
              </SimpleGrid>
            </Stack>

            <Button type="submit" color="indigo" fullWidth disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
              Register Shop
            </Button>
          </Stack>
        </form>

        <Text size="sm" ta="center" c="dimmed" mt="xs">
          Already have an account?{" "}
          <Anchor component={Link} href="/login" fw={500}>
            Sign in
          </Anchor>
        </Text>
      </Stack>
    </Card>
  );
}
