"use client";

import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchCurrentSubscription } from "@/lib/api/subscription";

const URGENT_THRESHOLD_DAYS = 3;

/**
 * Reusable trial/subscription banner (spec §20/§29) — shows nothing once the
 * shop isn't on a trial plan, or while loading, so it's safe to drop
 * anywhere (dashboard, subscription page) without a layout flash. Escalates
 * as expiry approaches (spec §34): a plain notice with days remaining, then
 * the `destructive` variant + more urgent phrasing once `daysRemaining` is
 * ≤3 (Alert only has two variants — default/destructive — so escalation is
 * two-tier, not the full 14/7/3/1-day ladder the spec sketches).
 */
export function TrialStatus() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: fetchCurrentSubscription,
  });

  if (isLoading || !subscription || !subscription.plan.isTrial) return null;

  const daysRemaining = subscription.daysRemaining ?? 0;
  const endDateLabel = subscription.endDate ? format(new Date(subscription.endDate), "d MMM yyyy") : null;
  const isUrgent = subscription.isExpired || daysRemaining <= URGENT_THRESHOLD_DAYS;

  let title: string;
  let message: string;
  if (subscription.isExpired) {
    title = "Free trial expired";
    message = "Your free trial has ended. Choose a plan to keep using the POS.";
  } else if (daysRemaining === 1) {
    title = "Free trial ends tomorrow";
    message = `Choose a plan before it expires${endDateLabel ? ` (${endDateLabel})` : ""} to avoid losing access.`;
  } else if (daysRemaining <= URGENT_THRESHOLD_DAYS) {
    title = "Free trial ending soon";
    message = `Only ${daysRemaining} days left${endDateLabel ? ` — trial ends ${endDateLabel}` : ""}. Choose a plan to keep using the POS.`;
  } else {
    title = "Free Trial";
    message = `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining${endDateLabel ? ` — trial ends ${endDateLabel}` : ""}.`;
  }

  return (
    <Alert variant={isUrgent ? "destructive" : "default"}>
      <CalendarClock className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
