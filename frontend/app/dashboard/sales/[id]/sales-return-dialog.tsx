"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  Button,
  Select,
  Table,
  TextInput,
  Text,
} from "@mantine/core";
import { createSalesReturn } from "@/lib/api/sales-returns";
import type { SaleDetail } from "@/lib/api/sales";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";

interface SalesReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleDetail;
}

export function SalesReturnDialog({ open, onOpenChange, sale }: SalesReturnDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={`Return Items — ${sale.invoiceNumber}`}
      size="xl"
    >
      {open && <SalesReturnDialogBody key={sale.id} sale={sale} onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function SalesReturnDialogBody({ sale, onOpenChange }: { sale: SaleDetail; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [refundMethod, setRefundMethod] = useState<string | null>("cash");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const productGroups = useMemo(() => {
    const map = new Map<string, { productId: string; sku: string; name: string; soldQty: number }>();
    for (const item of sale.items) {
      const existing = map.get(item.productId);
      if (existing) existing.soldQty += item.quantity;
      else map.set(item.productId, { productId: item.productId, sku: item.sku, name: item.name, soldQty: item.quantity });
    }
    return Array.from(map.values());
  }, [sale.items]);

  const mutation = useMutation({
    mutationFn: () => {
      const items = productGroups
        .map((group) => ({
          productId: group.productId,
          quantity: Number(quantities[group.productId] || 0),
          reason: reasons[group.productId]?.trim() || undefined,
        }))
        .filter((item) => item.quantity > 0);
      return createSalesReturn({ saleId: sale.id, items, refundMethod: refundMethod ?? "cash" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", sale.id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      toast.success("Return processed and refund recorded.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const hasAnyQuantity = productGroups.some((g) => Number(quantities[g.productId] || 0) > 0);

  const refundOptions = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  const rows = productGroups.map((group) => (
    <Table.Tr key={group.productId}>
      <Table.Td fw={500}>{group.name}</Table.Td>
      <Table.Td ta="right">{group.soldQty}</Table.Td>
      <Table.Td>
        <TextInput
          inputMode="numeric"
          w={80}
          placeholder="0"
          value={quantities[group.productId] ?? ""}
          onChange={(e) => setQuantities((prev) => ({ ...prev, [group.productId]: e.currentTarget.value }))}
        />
      </Table.Td>
      <Table.Td>
        <TextInput
          placeholder="Optional"
          value={reasons[group.productId] ?? ""}
          onChange={(e) => setReasons((prev) => ({ ...prev, [group.productId]: e.currentTarget.value }))}
        />
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">Choose how many units of each product the customer is returning.</Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th w={100} ta="right">Sold</Table.Th>
            <Table.Th w={120}>Return Qty</Table.Th>
            <Table.Th>Reason</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>

      <Select
        label="Refund Method"
        data={refundOptions}
        value={refundMethod}
        onChange={(v) => setRefundMethod(v)}
      />

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={!hasAnyQuantity || mutation.isPending} loading={mutation.isPending} onClick={() => mutation.mutate()} color="indigo">
          Process Return
        </Button>
      </Group>
    </Stack>
  );
}
