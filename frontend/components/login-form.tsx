"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { login, logout } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";
import { currentUserQueryKey } from "@/hooks/use-current-user";

// Mirrors the backend's loginSchema (modules/auth/auth.validation.ts).
const loginFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  /**
   * "shop" (default): the public login at /login used by real shop
   * owners/staff — shows the "Register Shop" self-signup link. "platform":
   * the dedicated /admin/login used only by platform staff — no self-signup
   * link, since registering a shop isn't something platform staff do from
   * here. Post-login redirect itself is unaffected by this — it's already
   * driven by the logged-in account's own `shopId` below, regardless of
   * which page they logged in from.
   */
  variant?: "shop" | "platform";
}

export function LoginForm({ variant = "shop" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => login(values.username, values.password),
    onSuccess: async (user) => {
      // Each login page is only meant for one kind of account — /login for
      // real shop owners/staff, /admin/login for platform staff. The
      // credentials just checked out, but for the wrong surface: log back
      // out (the backend already set the auth cookie by this point) and
      // reject, rather than silently letting either account type in through
      // either door and just routing around the mismatch.
      const isPlatformAdmin = user.shopId === null;
      if ((variant === "platform") !== isPlatformAdmin) {
        await logout();
        setFormError(
          variant === "platform"
            ? "This login is for platform staff only. Shop accounts sign in at the regular login page."
            : "This account is a platform admin account. Use the platform admin login instead.",
        );
        return;
      }

      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      toast.success(`Welcome back, ${user.name}.`);
      if (isPlatformAdmin) {
        router.push("/admin");
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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{variant === "platform" ? "Platform Admin" : "Mobile Shop POS"}</CardTitle>
        <CardDescription>Sign in with your username and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
            {errors.username ? <p className="text-sm text-destructive">{errors.username.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting || loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {variant === "shop" ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline underline-offset-2 hover:text-foreground">
              Register Shop
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
