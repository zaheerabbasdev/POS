"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchCurrentSubscription } from "@/lib/api/subscription";

/**
 * Reusable trial/subscription banner (spec §20/§29) — shows nothing once the
 * shop isn't on a trial plan, or while loading, so it's safe to drop
 * anywhere (dashboard, subscription page) without a layout flash.
 */
export function TrialStatus() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: fetchCurrentSubscription,
  });

  if (isLoading || !subscription || !subscription.plan.isTrial) return null;

  const daysRemaining = subscription.daysRemaining ?? 0;
  const endDateLabel = subscription.endDate ? format(new Date(subscription.endDate), "d MMM yyyy") : null;

  return (
    <Alert variant={subscription.isExpired ? "destructive" : "default"}>
      <CalendarClock className="size-4" />
      <AlertTitle>{subscription.isExpired ? "Free trial expired" : "Free Trial"}</AlertTitle>
      <AlertDescription>
        {subscription.isExpired
          ? "Your free trial has ended. Choose a plan to keep using the POS."
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining${endDateLabel ? ` — trial ends ${endDateLabel}` : ""}.`}
      </AlertDescription>
    </Alert>
  );
}
