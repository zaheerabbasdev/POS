"use client";

import { useQuery } from "@tanstack/react-query";
import { Stack, Card, Text, Badge } from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { RequirePermission } from "@/components/require-permission";
import { fetchShopsPerformance, fetchSubscriptionOverview } from "@/lib/api/admin-reports";

function AdminReportsPageContent() {
  const { data: shopRows, isLoading: shopsLoading } = useQuery({
    queryKey: ["admin", "reports", "shops-performance"],
    queryFn: fetchShopsPerformance,
  });

  const { data: planRows, isLoading: plansLoading } = useQuery({
    queryKey: ["admin", "reports", "subscription-overview"],
    queryFn: fetchSubscriptionOverview,
  });

  return (
    <Stack gap="lg">
      <PageHeader
        title="Reports"
        description="Performance across every shop on the platform."
      />

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Stack gap={0}>
          <Stack gap={4} p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <Text fw={600} size="lg">Shop Performance</Text>
            <Text size="sm" c="dimmed">Lifetime sales and purchase totals per shop.</Text>
          </Stack>
          
          <DataTable
            data={shopRows ?? []}
            isLoading={shopsLoading}
            keyExtractor={(row) => row.id}
            emptyTitle="No shops yet."
            columns={[
              { key: "shop", header: "Shop", render: (r) => <Text size="sm" fw={500}>{r.name}</Text> },
              { key: "owner", header: "Owner", render: (r) => <Text size="sm">{r.ownerName ?? "—"}</Text> },
              { key: "plan", header: "Plan", render: (r) => <Text size="sm">{r.planName ?? "—"}</Text> },
              { key: "status", header: "Status", render: (r) => <ShopStatusBadge status={r.status} /> },
              { key: "sales", header: "Total Sales", align: "right", render: (r) => <Text size="sm">{r.totalSales}</Text> },
              { key: "purchases", header: "Total Purchases", align: "right", render: (r) => <Text size="sm">{r.totalPurchases}</Text> },
            ]}
          />
        </Stack>
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Stack gap={0}>
          <Stack gap={4} p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <Text fw={600} size="lg">Subscription Overview</Text>
            <Text size="sm" c="dimmed">How shops are distributed across plans, and lifetime revenue per plan.</Text>
          </Stack>

          <DataTable
            data={planRows ?? []}
            isLoading={plansLoading}
            keyExtractor={(row) => row.id}
            emptyTitle="No plans yet."
            columns={[
              { key: "plan", header: "Plan", render: (r) => <Text size="sm" fw={500}>{r.name}</Text> },
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
              { key: "shops", header: "Shops on Plan", align: "right", render: (r) => <Text size="sm">{r.shopsCurrentlyOnPlan}</Text> },
              {
                key: "revenue",
                header: "Lifetime Revenue",
                align: "right",
                render: (r) => (
                  <Text size="sm">
                    {r.currency} {r.lifetimeRevenue}
                  </Text>
                ),
              },
            ]}
          />
        </Stack>
      </Card>
    </Stack>
  );
}

export default function AdminReportsPage() {
  return (
    <RequirePermission permissions={["PLATFORM_REPORT_VIEW"]}>
      <AdminReportsPageContent />
    </RequirePermission>
  );
}
