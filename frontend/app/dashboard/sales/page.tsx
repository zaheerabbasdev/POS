"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Anchor,
  Box,
  Badge,
} from "@mantine/core";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { MoneyText } from "@/components/currency-display";
import { fetchSales } from "@/lib/api/sales";

const PAGE_SIZE = 50;

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // TanStack Query unchanged — same queryKey, queryFn, and API call
  const { data, isLoading } = useQuery({
    queryKey: ["sales", { page }],
    queryFn: () => fetchSales({ page, limit: PAGE_SIZE }),
  });

  // Client-side search filter — unchanged from original
  const filtered = search
    ? (data?.data ?? []).filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          s.customer?.toLowerCase().includes(search.toLowerCase()),
      )
    : (data?.data ?? []);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Sales"
        description="Sales history and invoices."
        actions={
          <Button
            component={Link}
            href="/dashboard/pos"
            leftSection={<Plus size={16} />}
            color="indigo"
          >
            New Sale
          </Button>
        }
      />

      {/* Toolbar */}
      <Group gap="sm">
        <TextInput
          placeholder="Search invoice # or customer…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
      </Group>

      {/* Table */}
      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={filtered}
          keyExtractor={(row) => row.id}
          emptyTitle={search ? "No matching sales" : "No sales yet"}
          emptyDescription={
            search
              ? "No sales match your search. Try a different invoice number or customer name."
              : "Sales will appear here once the first sale is recorded via the POS."
          }
          columns={[
            {
              key: "invoice",
              header: "Invoice #",
              render: (sale) => (
                <Anchor
                  component={Link}
                  href={`/dashboard/sales/${sale.id}`}
                  size="sm"
                  style={{
                    fontFamily: "var(--mantine-font-family-monospace)",
                    fontWeight: 500,
                  }}
                >
                  {sale.invoiceNumber}
                </Anchor>
              ),
              minWidth: 130,
            },
            {
              key: "customer",
              header: "Customer",
              render: (sale) => (
                <Text size="sm" fw={500}>
                  {sale.customer || "Walk-in"}
                </Text>
              ),
            },
            {
              key: "cashier",
              header: "Cashier",
              render: (sale) => (
                <Text size="sm" c="dimmed">
                  {sale.cashier ?? "—"}
                </Text>
              ),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              render: (sale) => <MoneyText value={sale.totalAmount} fw={500} />,
              minWidth: 100,
            },
            {
              key: "status",
              header: "Status",
              render: (sale) => (
                <Group gap={4}>
                  <StatusBadge status={sale.status} type="sale" />
                  {sale.isCancelled && (
                    <Badge color="gray" variant="light" size="sm">
                      Cancelled
                    </Badge>
                  )}
                </Group>
              ),
            },
            {
              key: "date",
              header: "Date",
              render: (sale) => (
                <Text size="sm" c="dimmed">
                  {sale.saleDate
                    ? new Date(sale.saleDate).toLocaleDateString()
                    : "—"}
                </Text>
              ),
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
