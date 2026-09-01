"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  TextInput,
  PasswordInput,
  SimpleGrid,
  Alert,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { RequirePermission } from "@/components/require-permission";
import { createShop } from "@/lib/api/shops";
import { getApiErrorMessage } from "@/lib/api-client";

const createShopFormSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required."),
  shopPhone: z.string().trim().min(1, "Shop phone is required."),
  shopEmail: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  shopCity: z.string().trim().optional(),
  shopCountry: z.string().trim().optional(),
  shopAddress: z.string().trim().optional(),
  ownerName: z.string().trim().min(1, "Owner name is required."),
  username: z.string().trim().min(3, "Username must be at least 3 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Temporary password must be at least 8 characters."),
});

type CreateShopFormValues = z.infer<typeof createShopFormSchema>;

function NewShopPageContent() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateShopFormValues>({
    resolver: zodResolver(createShopFormSchema),
    defaultValues: {
      shopName: "",
      shopPhone: "",
      shopEmail: "",
      shopCity: "",
      shopCountry: "",
      shopAddress: "",
      ownerName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateShopFormValues) =>
      createShop({
        shop: {
          name: values.shopName,
          phone: values.shopPhone,
          ...(values.shopEmail ? { email: values.shopEmail } : {}),
          ...(values.shopCity ? { city: values.shopCity } : {}),
          ...(values.shopCountry ? { country: values.shopCountry } : {}),
          ...(values.shopAddress ? { address: values.shopAddress } : {}),
        },
        owner: {
          name: values.ownerName,
          username: values.username,
          email: values.email,
          password: values.password,
        },
      }),
    onSuccess: (shop) => {
      toast.success(`Shop "${shop.name}" created with a 1-month free trial.`);
      router.push(`/admin/shops/${shop.id}`);
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  return (
    <Stack gap="lg">
      <PageHeader
        title="Create Shop"
        description="New shops automatically receive a 1-month free trial."
      />

      <Card shadow="sm" radius="md" withBorder maw={600}>
        <Stack gap="md">
          <Stack gap={4}>
            <Text fw={600} size="lg">Shop &amp; owner details</Text>
            <Text size="sm" c="dimmed">The owner can log in with these credentials right away.</Text>
          </Stack>

          <form
            onSubmit={handleSubmit((values) => {
              setFormError(null);
              mutation.mutate(values);
            })}
            noValidate
          >
            <Stack gap="lg">
              {formError ? (
                <Alert variant="light" color="red" title="Error">
                  {formError}
                </Alert>
              ) : null}

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
                <Text size="sm" fw={600} c="dimmed" tt="uppercase">Owner login</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="Owner name"
                    {...register("ownerName")}
                    error={errors.ownerName?.message}
                  />
                  <TextInput
                    label="Username"
                    {...register("username")}
                    error={errors.username?.message}
                  />
                  <TextInput
                    label="Email"
                    type="email"
                    {...register("email")}
                    error={errors.email?.message}
                  />
                  <PasswordInput
                    label="Temporary password"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                </SimpleGrid>
              </Stack>

              <Button type="submit" color="indigo" fullWidth disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                Create Shop
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Stack>
  );
}

export default function NewShopPage() {
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_CREATE"]}>
      <NewShopPageContent />
    </RequirePermission>
  );
}
