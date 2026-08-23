"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";

/**
 * A Platform Admin (`shopId: null`) and a shop user (`shopId` set) each have
 * their own area (`/admin` vs `/dashboard`) with no overlap — this redirects
 * whichever one lands in the wrong area (typed URL, stale bookmark, browser
 * back) to their own, mirroring the split login-form.tsx already routes to.
 * Renders nothing itself; mount alongside a layout's real content so there's
 * no render-blocking wait on the redirect check.
 */
export function TenantRedirectGuard({ expect }: { expect: "platform" | "shop" }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    const isPlatformAdmin = user.shopId === null;
    if (expect === "platform" && !isPlatformAdmin) router.replace("/dashboard");
    if (expect === "shop" && isPlatformAdmin) router.replace("/admin");
  }, [user, expect, router]);

  return null;
}
