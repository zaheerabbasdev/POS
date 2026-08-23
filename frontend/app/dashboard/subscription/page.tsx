"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TrialStatus } from "@/components/trial-status";
import { fetchCurrentSubscription, fetchSelectablePlans, selectPlan } from "@/lib/api/subscription";
import { getApiErrorMessage } from "@/lib/api-client";
import type { SubscriptionPlan } from "@/lib/api/subscription-plans";

const SUBSCRIPTION_QUERY_KEY = ["subscription", "current"];

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const { data: subscription, isLoading } = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: fetchCurrentSubscription,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: fetchSelectablePlans,
  });

  const mutation = useMutation({
    mutationFn: (planId: string) => selectPlan(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
      toast.success(`Switched to ${selectedPlan?.name}.`);
      setSelectedPlan(null);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">Your shop's current plan and trial status.</p>
      </div>

      <TrialStatus />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-56" />
            </div>
          ) : subscription ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium">{subscription.plan.name}</dd>

              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{subscription.status}</dd>

              <dt className="text-muted-foreground">Started</dt>
              <dd>{format(new Date(subscription.startDate), "d MMM yyyy")}</dd>

              <dt className="text-muted-foreground">{subscription.plan.isTrial ? "Trial ends" : "Renews / ends"}</dt>
              <dd>{subscription.endDate ? format(new Date(subscription.endDate), "d MMM yyyy") : "No end date"}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No subscription found.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Available Plans</h2>
        {plansLoading ? (
          <Skeleton className="h-32 w-full max-w-3xl" />
        ) : plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan.id === plan.id;
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <p className="text-2xl font-semibold">
                      {Number(plan.price) > 0 ? `${plan.currency} ${plan.price}` : "Free"}
                      {Number(plan.price) > 0 ? (
                        <span className="text-sm font-normal text-muted-foreground"> / {plan.billingInterval.toLowerCase()}</span>
                      ) : null}
                    </p>
                    {plan.description ? <p className="text-sm text-muted-foreground">{plan.description}</p> : null}
                    <Button
                      className="mt-2 w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {isCurrent ? "Current Plan" : "Switch to this plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No plans are available right now.</p>
        )}
      </div>

      <ConfirmDialog
        open={selectedPlan !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPlan(null);
        }}
        title="Switch plan"
        description={
          selectedPlan
            ? `Switch to "${selectedPlan.name}"? This takes effect immediately.${
                Number(selectedPlan.price) > 0
                  ? " Billing collection for paid plans isn't automated yet — the platform will follow up separately."
                  : ""
              }`
            : ""
        }
        confirmLabel="Switch Plan"
        isPending={mutation.isPending}
        onConfirm={() => selectedPlan && mutation.mutate(selectedPlan.id)}
      />
    </div>
  );
}
