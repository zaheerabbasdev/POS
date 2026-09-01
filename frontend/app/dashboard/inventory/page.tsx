"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paper,
  Stack,
  Group,
  Select,
  Text,
  Badge,
  Box,
} from "@mantine/core";
import { History as HistoryIcon, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { fetchInventory, type InventoryItem } from "@/lib/api/inventory";
import { STOCK_STATUS_ITEMS } from "@/lib/select-items";
import { AdjustmentDialog } from "./adjustment-dialog";
import { HistoryDialog } from "./history-dialog";

const PAGE_SIZE = 50;

const STOCK_STATUS_LABEL: Record<InventoryItem["stockStatus"], { label: string; color: string }> = {
  in_stock: { label: "In stock", color: "green" },
  low_stock: { label: "Low stock", color: "yellow" },
  out_of_stock: { label: "Out of stock", color: "red" },
};

export default function InventoryPage() {
  const [stockStatus, setStockStatus] = useState<InventoryItem["stockStatus"] | "">("");
  const [page, setPage] = useState(1);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | undefined>(undefined);
  const [historyItem, setHistoryItem] = useState<InventoryItem | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", { stockStatus, page }],
    queryFn: () => fetchInventory({ stockStatus: stockStatus || undefined, page, limit: PAGE_SIZE }),
  });

  const statusSelectItems = Object.entries(STOCK_STATUS_ITEMS).map(([value, label]) => ({
    value: value === "all" ? "" : value,
    label,
  }));

  return (
    <Stack gap="lg">
      <PageHeader
        title="Inventory"
        description="Track stock levels and record manual adjustments."
      />

      <Group gap="sm">
        <Select
          placeholder="All stock levels"
          data={statusSelectItems}
          value={stockStatus || null}
          onChange={(v) => {
            setStockStatus((v ?? "") as InventoryItem["stockStatus"] | "");
            setPage(1);
          }}
          clearable
          style={{ width: 220 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.productId}
          emptyTitle={stockStatus ? "No matching inventory" : "No inventory yet"}
          emptyDescription={
            stockStatus
              ? "No items match the selected stock status."
              : "Inventory levels will appear here once products are added."
          }
          columns={[
            {
              key: "sku",
              header: "SKU",
              render: (item) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {item.sku}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Product",
              render: (item) => (
                <Text size="sm" fw={500}>
                  {item.name}
                </Text>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (item) => (
                <Text size="sm">
                  {item.category}
                </Text>
              ),
            },
            {
              key: "quantity",
              header: "Quantity",
              align: "right",
              render: (item) => (
                <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.quantity}
                </Text>
              ),
            },
            {
              key: "available",
              header: "Available",
              align: "right",
              render: (item) => (
                <Text size="sm" fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.availableQuantity}
                </Text>
              ),
            },
            {
              key: "reorder",
              header: "Reorder Level",
              align: "right",
              render: (item) => (
                <Text size="sm" c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.reorderLevel}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (item) => {
                const conf = STOCK_STATUS_LABEL[item.stockStatus];
                return (
                  <Badge color={conf.color} variant="light" size="sm">
                    {conf.label}
                  </Badge>
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (item) => (
                <ActionMenu
                  items={[
                    {
                      label: "View History",
                      icon: <HistoryIcon size={14} />,
                      onClick: () => setHistoryItem(item),
                    },
                    {
                      label: "Adjust Stock",
                      icon: <SlidersHorizontal size={14} />,
                      onClick: () => setAdjustingItem(item),
                    },
                  ]}
                />
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

      <AdjustmentDialog
        open={Boolean(adjustingItem)}
        onOpenChange={(open) => !open && setAdjustingItem(undefined)}
        item={adjustingItem}
      />
      <HistoryDialog
        open={Boolean(historyItem)}
        onOpenChange={(open) => !open && setHistoryItem(undefined)}
        item={historyItem}
      />
    </Stack>
  );
}
