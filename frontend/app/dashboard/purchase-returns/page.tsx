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
import { fetchPurchaseReturns } from "@/lib/api/purchase-returns";
import { fetchPurchase, type PurchaseDetail, type PurchaseListItem } from "@/lib/api/purchases";
import { getApiErrorMessage } from "@/lib/api-client";
import { PurchaseReturnDialog } from "../purchases/[id]/purchase-return-dialog";
import { PickPurchaseDialog } from "./pick-purchase-dialog";

const PAGE_SIZE = 50;

/** Return-to-supplier history — same gap as Sales Returns had: create path existed, no browse/search page until now. */
export default function PurchaseReturnsPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // "+ New Return" — pick the original purchase first (it needs full
  // line-item detail, which the list row doesn't have), then hand off to
  // the same PurchaseReturnDialog the purchase detail page already uses.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);

  const handlePicked = async (item: PurchaseListItem) => {
    setIsLoadingPurchase(true);
    try {
      const detail = await fetchPurchase(item.id);
      setSelectedPurchase(detail);
      setPickerOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsLoadingPurchase(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-returns", { startDate, endDate, page }],
    queryFn: () =>
      fetchPurchaseReturns({ startDate: startDate || undefined, endDate: endDate || undefined, page, limit: PAGE_SIZE }),
  });

  const filtered = search
    ? data?.data.filter(
        (r) =>
          r.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.supplier.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Purchase Returns"
        description="Every item sent back to a supplier, and the credit it created."
        actions={
          <Button
            onClick={() => setPickerOpen(true)}
            disabled={isLoadingPurchase}
            loading={isLoadingPurchase}
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
          placeholder="Purchase # or supplier…"
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
          emptyDescription="No purchase returns match your current filters."
          columns={[
            {
              key: "purchase",
              header: "Purchase #",
              render: (r) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.purchaseNumber}
                </Text>
              ),
            },
            {
              key: "supplier",
              header: "Supplier",
              render: (r) => (
                <Text size="sm" fw={500}>
                  {r.supplier}
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
              key: "credit",
              header: "Credit",
              align: "right",
              render: (r) => <MoneyText value={r.returnAmount} />,
            },
            {
              key: "reason",
              header: "Reason",
              render: (r) => (
                <Text size="sm" c="dimmed" truncate style={{ maxWidth: 200 }}>
                  {r.reason ?? "—"}
                </Text>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (r) => (
                <Anchor component={Link} href={`/dashboard/purchases/${r.purchaseId}`} size="sm" fw={500}>
                  View Purchase
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

      <PickPurchaseDialog open={pickerOpen} onOpenChange={setPickerOpen} onPicked={(item) => void handlePicked(item)} />
      {selectedPurchase ? (
        <PurchaseReturnDialog
          open={Boolean(selectedPurchase)}
          onOpenChange={(open) => !open && setSelectedPurchase(null)}
          purchase={selectedPurchase}
        />
      ) : null}
    </Stack>
  );
}
