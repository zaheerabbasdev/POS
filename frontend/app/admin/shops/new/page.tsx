"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Shop</h1>
        <p className="text-muted-foreground">New shops automatically receive a 1-month free trial.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Shop &amp; owner details</CardTitle>
          <CardDescription>The owner can log in with these credentials right away.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
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

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Shop information</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Shop name" htmlFor="shopName" error={errors.shopName?.message}>
                  <Input id="shopName" autoFocus {...register("shopName")} />
                </Field>
                <Field label="Phone" htmlFor="shopPhone" error={errors.shopPhone?.message}>
                  <Input id="shopPhone" {...register("shopPhone")} />
                </Field>
                <Field label="Email (optional)" htmlFor="shopEmail" error={errors.shopEmail?.message}>
                  <Input id="shopEmail" type="email" {...register("shopEmail")} />
                </Field>
                <Field label="City (optional)" htmlFor="shopCity" error={errors.shopCity?.message}>
                  <Input id="shopCity" {...register("shopCity")} />
                </Field>
                <Field label="Country (optional)" htmlFor="shopCountry" error={errors.shopCountry?.message}>
                  <Input id="shopCountry" {...register("shopCountry")} />
                </Field>
                <Field label="Address (optional)" htmlFor="shopAddress" error={errors.shopAddress?.message}>
                  <Input id="shopAddress" {...register("shopAddress")} />
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Owner login</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Owner name" htmlFor="ownerName" error={errors.ownerName?.message}>
                  <Input id="ownerName" {...register("ownerName")} />
                </Field>
                <Field label="Username" htmlFor="username" error={errors.username?.message}>
                  <Input id="username" {...register("username")} />
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email?.message}>
                  <Input id="email" type="email" {...register("email")} />
                </Field>
                <Field label="Temporary password" htmlFor="password" error={errors.password?.message}>
                  <Input id="password" type="password" {...register("password")} />
                </Field>
              </div>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Creating shop..." : "Create Shop"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export default function NewShopPage() {
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_CREATE"]}>
      <NewShopPageContent />
    </RequirePermission>
  );
}
