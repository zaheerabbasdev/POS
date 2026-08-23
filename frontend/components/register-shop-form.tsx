"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">You&apos;re all set 🎉</CardTitle>
          <CardDescription>Your shop has been registered.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>
              Your 1-month free trial is active — no payment required.
              {trialEndDate ? ` It runs until ${new Date(trialEndDate).toLocaleDateString()}.` : null}
            </AlertDescription>
          </Alert>
          <Button
            className="w-full"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Continue to POS
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-xl">Register your shop</CardTitle>
        <CardDescription>Set up your shop and start a 1-month free trial — no payment required.</CardDescription>
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
                <Input id="shopPhone" autoComplete="tel" {...register("shopPhone")} />
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
            <h3 className="text-sm font-semibold text-muted-foreground">Owner login information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Owner name" htmlFor="ownerName" error={errors.ownerName?.message}>
                <Input id="ownerName" {...register("ownerName")} />
              </Field>
              <Field label="Username" htmlFor="username" error={errors.username?.message}>
                <Input id="username" autoComplete="username" {...register("username")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
              </Field>
              <div />
              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              </Field>
              <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
                <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
              </Field>
            </div>
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Creating your shop..." : "Register Shop"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
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
