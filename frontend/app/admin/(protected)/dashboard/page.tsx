"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Store, CheckCircle2, Hourglass, AlarmClockCheck, XCircle, Ban, Users, BadgeDollarSign } from "lucide-react";
import {
  Stack,
  SimpleGrid,
  Card,
  Text,
  Skeleton,
  Anchor,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatTile } from "@/components/stat-tile";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchPlatformDashboardSummary } from "@/lib/api/admin-dashboard";

export default function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: fetchPlatformDashboardSummary,
  });

  return (
    <Stack gap="lg">
      <PageHeader
        title={user ? `Welcome, ${user.name}` : <Skeleton height={32} width={250} />}
        description="Platform health, at a glance."
      />

      {isLoading || !summary ? (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <StatTile label="Total Shops" value={summary.totalShops} icon={Store} />
          <StatTile label="Active Shops" value={summary.activeShops} icon={CheckCircle2} />
          <StatTile label="Trial Shops" value={summary.trialShops} icon={Hourglass} />
          <StatTile
            label="Expiring Trials (7d)"
            value={summary.expiringTrials}
            icon={AlarmClockCheck}
            tone={summary.expiringTrials > 0 ? "warning" : "default"}
          />
          <StatTile
            label="Expired Shops"
            value={summary.expiredShops}
            icon={XCircle}
            tone={summary.expiredShops > 0 ? "critical" : "default"}
          />
          <StatTile
            label="Suspended Shops"
            value={summary.suspendedShops}
            icon={Ban}
            tone={summary.suspendedShops > 0 ? "critical" : "default"}
          />
          <StatTile label="Total Users" value={summary.totalUsers} icon={Users} />
          <StatTile label="New Subs Revenue (Month)" value={summary.newSubscriptionRevenueThisMonth} icon={BadgeDollarSign} />
        </SimpleGrid>
      )}

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Text fw={600} size="lg" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          Recent Shops
        </Text>
        <DataTable
          data={summary?.recentShops ?? []}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No shops yet."
          columns={[
            {
              key: "shop",
              header: "Shop",
              render: (r) => (
                <Anchor component={Link} href={`/admin/shops/${r.id}`} fw={500} c="indigo">
                  {r.name}
                </Anchor>
              ),
            },
            { key: "owner", header: "Owner", render: (r) => <Text size="sm">{r.ownerName ?? "—"}</Text> },
            { key: "status", header: "Status", render: (r) => <ShopStatusBadge status={r.status} /> },
            { key: "created", header: "Created", render: (r) => <Text size="sm">{new Date(r.createdAt).toLocaleDateString()}</Text> },
          ]}
        />
      </Card>
    </Stack>
  );
}
