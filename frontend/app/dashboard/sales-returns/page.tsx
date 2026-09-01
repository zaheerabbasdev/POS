"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Anchor,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { MoneyText } from "@/components/currency-display";
import { fetchSalesReturns } from "@/lib/api/sales-returns";
import { fetchSale, type SaleDetail, type SaleListItem } from "@/lib/api/sales";
import { getApiErrorMessage } from "@/lib/api-client";
import { SalesReturnDialog } from "../sales/[id]/sales-return-dialog";
import { PickSaleDialog } from "./pick-sale-dialog";

const PAGE_SIZE = 50;

/** Return history — DDD Chapter 35's "Return Workflow" had a create path but no browse/search page until now. */
export default function SalesReturnsPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // "+ New Return" — pick the original sale first (it needs full line-item
  // detail, which the list row doesn't have), then hand off to the same
  // SalesReturnDialog the sale detail page already uses.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [isLoadingSale, setIsLoadingSale] = useState(false);

  const handlePicked = async (item: SaleListItem) => {
    if (item.isCancelled) {
      toast.error("This sale was cancelled — nothing to return.");
      return;
    }
    setIsLoadingSale(true);
    try {
      const detail = await fetchSale(item.id);
      setSelectedSale(detail);
      setPickerOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsLoadingSale(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["sales-returns", { startDate, endDate, page }],
    queryFn: () =>
      fetchSalesReturns({ startDate: startDate || undefined, endDate: endDate || undefined, page, limit: PAGE_SIZE }),
  });

  const filtered = search
    ? data?.data.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.customer.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Sales Returns"
        description="Every item a customer has returned, with the refund it triggered."
        actions={
          <Button
            onClick={() => setPickerOpen(true)}
            disabled={isLoadingSale}
            loading={isLoadingSale}
            leftSection={<Plus size={16} />}
            color="indigo"
          >
            New Return
          </Button>
        }
      />

      <Group gap="sm" align="flex-end">
        <TextInput
          label="Search"
          placeholder="Invoice # or customer…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <TextInput
          type="date"
          label="From"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
        />
        <TextInput
          type="date"
          label="To"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={filtered ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle="No returns found"
          emptyDescription="No sales returns match your current filters."
          columns={[
            {
              key: "invoice",
              header: "Invoice #",
              render: (r) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.invoiceNumber}
                </Text>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (r) => (
                <Text size="sm" fw={500}>
                  {r.customer}
                </Text>
              ),
            },
            {
              key: "date",
              header: "Date",
              render: (r) => (
                <Text size="sm" c="dimmed">
                  {new Date(r.returnDate).toLocaleDateString()}
                </Text>
              ),
            },
            {
              key: "items",
              header: "Items Returned",
              render: (r) => (
                <Text size="sm" c="dimmed">
                  {r.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                </Text>
              ),
            },
            {
              key: "refund",
              header: "Refund",
              align: "right",
              render: (r) => <MoneyText value={r.refundAmount} />,
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <Text size="sm" c="dimmed" truncate style={{ maxWidth: 200 }}>
                  {r.returnReason ?? "—"}
                </Text>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (r) => (
                <Anchor component={Link} href={`/dashboard/sales/${r.saleId}`} size="sm" fw={500}>
                  View Sale
                </Anchor>
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

      <PickSaleDialog open={pickerOpen} onOpenChange={setPickerOpen} onPicked={(item) => void handlePicked(item)} />
      {selectedSale ? (
        <SalesReturnDialog
          open={Boolean(selectedSale)}
          onOpenChange={(open) => !open && setSelectedSale(null)}
          sale={selectedSale}
        />
      ) : null}
    </Stack>
  );
}
