"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import {
  Stack,
  Group,
  TextInput,
  Button,
  Select,
  Card,
  Anchor,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { RequirePermission } from "@/components/require-permission";
import { fetchShops, type ShopStatus } from "@/lib/api/shops";

const PAGE_SIZE = 20;
const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "TRIAL", label: "Trial" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
];

function AdminShopsPageContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ShopStatus>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shops", { search, status, page }],
    queryFn: () =>
      fetchShops({
        search: search || undefined,
        ...(status !== "all" ? { status } : {}),
        page,
        limit: PAGE_SIZE,
      }),
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title="Shops"
          description="Every shop on the platform, its owner, plan, and trial status."
        />
        <Button component={Link} href="/admin/shops/new" leftSection={<Plus size={16} />} color="indigo">
          Create Shop
        </Button>
      </Group>

      <Group>
        <TextInput
          placeholder="Search by shop or owner name..."
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
          w="100%"
          maw={300}
        />
        <Select
          data={STATUS_ITEMS}
          value={status}
          onChange={(val) => {
            if (val) {
              setStatus(val as "all" | ShopStatus);
              setPage(1);
            }
          }}
          w={200}
        />
      </Group>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <DataTable
          data={data?.data ?? []}
          isLoading={isLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No shops found."
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
            { key: "plan", header: "Plan", render: (r) => <Text size="sm">{r.planName ?? "—"}</Text> },
            { key: "status", header: "Status", render: (r) => <ShopStatusBadge status={r.status} /> },
            {
              key: "trialEnd",
              header: "Trial ends",
              render: (r) => <Text size="sm">{r.trialEndDate ? new Date(r.trialEndDate).toLocaleDateString() : "—"}</Text>,
            },
            { key: "days", header: "Days remaining", render: (r) => <Text size="sm">{r.daysRemaining ?? "—"}</Text> },
            {
              key: "actions",
              header: "Actions",
              align: "right",
              render: (r) => (
                <Button component={Link} href={`/admin/shops/${r.id}`} variant="subtle" size="xs">
                  View
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {data ? (
        <PaginationControls
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </Stack>
  );
}

export default function AdminShopsPage() {
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_VIEW"]}>
      <AdminShopsPageContent />
    </RequirePermission>
  );
}
