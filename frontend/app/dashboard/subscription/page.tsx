"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Stack,
  Card,
  Text,
  Button,
  SimpleGrid,
  Skeleton,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
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
    <Stack gap="lg">
      <PageHeader
        title="Subscription"
        description="Your shop's current plan and trial status."
      />

      <TrialStatus />

      <Card shadow="sm" radius="md" withBorder maw={500}>
        <Text fw={600} size="lg" mb="md">Current plan</Text>
        
        {isLoading ? (
          <Stack gap="sm">
            <Skeleton height={20} width="40%" />
            <Skeleton height={20} width="60%" />
          </Stack>
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
          <Text size="sm" c="dimmed">No subscription found.</Text>
        )}
      </Card>

      <Stack gap="sm">
        <Text size="lg" fw={600}>Available Plans</Text>
        
        {plansLoading ? (
          <Skeleton height={200} radius="md" />
        ) : plans && plans.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {plans.map((plan) => {
              const isCurrent = subscription?.plan.id === plan.id;
              return (
                <Card key={plan.id} shadow="sm" radius="md" withBorder>
                  <Text fw={600} size="lg" mb="sm">{plan.name}</Text>
                  
                  <Stack gap="sm">
                    <Text size="xl" fw={600}>
                      {Number(plan.price) > 0 ? `${plan.currency} ${plan.price}` : "Free"}
                      {Number(plan.price) > 0 ? (
                        <Text component="span" size="sm" fw={400} c="dimmed"> / {plan.billingInterval.toLowerCase()}</Text>
                      ) : null}
                    </Text>
                    {plan.description ? <Text size="sm" c="dimmed">{plan.description}</Text> : null}
                    <Button
                      mt="md"
                      fullWidth
                      variant={isCurrent ? "outline" : "filled"}
                      color={isCurrent ? "gray" : "indigo"}
                      disabled={isCurrent}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      {isCurrent ? "Current Plan" : "Switch to this plan"}
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          <Text size="sm" c="dimmed">No plans are available right now.</Text>
        )}
      </Stack>

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
    </Stack>
  );
}
