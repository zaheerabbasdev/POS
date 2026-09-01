"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Paper, Stack, Group, TextInput, Button, Text, Anchor, Box } from "@mantine/core";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { MoneyText } from "@/components/currency-display";
import { fetchPurchases } from "@/lib/api/purchases";

const PAGE_SIZE = 50;

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Unchanged TanStack Query
  const { data, isLoading } = useQuery({
    queryKey: ["purchases", { page }],
    queryFn: () => fetchPurchases({ page, limit: PAGE_SIZE }),
  });

  const filtered = search
    ? (data?.data ?? []).filter(
        (p) =>
          p.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
          p.supplier?.toLowerCase().includes(search.toLowerCase()),
      )
    : (data?.data ?? []);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Purchases"
        description="Supplier purchases, stock increases, and purchase invoices."
        actions={
          <Button
            component={Link}
            href="/dashboard/purchases/new"
            leftSection={<Plus size={16} />}
            color="indigo"
          >
            New Purchase
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search invoice # or supplier…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyTitle={search ? "No matching purchases" : "No purchases yet"}
          emptyDescription={
            search
              ? "No purchases match your search."
              : "Purchases will appear here once the first purchase is recorded."
          }
          columns={[
            {
              key: "invoice",
              header: "Invoice #",
              render: (p) => (
                <Anchor
                  component={Link}
                  href={`/dashboard/purchases/${p.id}`}
                  size="sm"
                  style={{ fontFamily: "var(--mantine-font-family-monospace)", fontWeight: 500 }}
                >
                  {p.invoiceNo}
                </Anchor>
              ),
              minWidth: 130,
            },
            {
              key: "supplier",
              header: "Supplier",
              render: (p) => (
                <Text size="sm" fw={500}>
                  {p.supplier}
                </Text>
              ),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              render: (p) => <MoneyText value={p.totalAmount} fw={500} />,
            },
            {
              key: "status",
              header: "Status",
              render: (p) => <StatusBadge status={p.status} type="purchase" />,
            },
          ]}
        />

        {data && (
          <Box style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            <PaginationControls
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
