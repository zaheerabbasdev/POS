"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Stack,
  Group,
  Button,
  Badge,
  Card,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { RequirePermission } from "@/components/require-permission";
import { fetchSubscriptionPlans, type SubscriptionPlan } from "@/lib/api/subscription-plans";
import { PlanFormDialog } from "./plan-form-dialog";

function AdminSubscriptionPlansPageContent() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | undefined>(undefined);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin", "subscription-plans"],
    queryFn: fetchSubscriptionPlans,
  });

  const openCreate = () => {
    setEditingPlan(undefined);
    setFormOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title="Subscription Plans"
          description="Plans shops can subscribe to from their own Subscription page."
        />
        <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
          Create Plan
        </Button>
      </Group>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <DataTable
          data={plans ?? []}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No plans yet."
          columns={[
            { key: "name", header: "Name", render: (r) => <Text size="sm" fw={500}>{r.name}</Text> },
            {
              key: "price",
              header: "Price",
              render: (r) => <Text size="sm">{Number(r.price) > 0 ? `${r.currency} ${r.price}` : "Free"}</Text>,
            },
            { key: "billing", header: "Billing", render: (r) => <Text size="sm">{r.billingInterval}</Text> },
            { key: "duration", header: "Duration", render: (r) => <Text size="sm">{r.durationDays > 0 ? `${r.durationDays} days` : "No expiry"}</Text> },
            {
              key: "type",
              header: "Type",
              render: (r) => (
                <Badge variant={r.isTrial ? "outline" : "light"} color={r.isTrial ? "indigo" : "gray"}>
                  {r.isTrial ? "Trial" : "Paid"}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Badge variant="light" color={r.isActive ? "green" : "gray"}>
                  {r.isActive ? "Active" : "Inactive"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              align: "right",
              render: (r) => (
                <Button variant="subtle" size="xs" onClick={() => openEdit(r)}>
                  Edit
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <PlanFormDialog open={formOpen} onOpenChange={setFormOpen} plan={editingPlan} />
    </Stack>
  );
}

export default function AdminSubscriptionPlansPage() {
  return (
    <RequirePermission permissions={["PLATFORM_PLAN_VIEW"]}>
      <AdminSubscriptionPlansPageContent />
    </RequirePermission>
  );
}
