"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  Button,
  Table,
  TextInput,
  Text,
} from "@mantine/core";
import { createPurchaseReturn } from "@/lib/api/purchase-returns";
import type { PurchaseDetail } from "@/lib/api/purchases";
import { getApiErrorMessage } from "@/lib/api-client";

interface PurchaseReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseDetail;
}

export function PurchaseReturnDialog({ open, onOpenChange, purchase }: PurchaseReturnDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={`Return Items — ${purchase.invoiceNo}`}
      size="xl"
    >
      {open && <PurchaseReturnDialogBody key={purchase.id} purchase={purchase} onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function PurchaseReturnDialogBody({
  purchase,
  onOpenChange,
}: {
  purchase: PurchaseDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const productGroups = useMemo(() => {
    const map = new Map<string, { productId: string; sku: string; name: string; purchasedQty: number }>();
    for (const item of purchase.items) {
      const existing = map.get(item.productId);
      if (existing) existing.purchasedQty += item.quantity;
      else map.set(item.productId, { productId: item.productId, sku: item.sku, name: item.name, purchasedQty: item.quantity });
    }
    return Array.from(map.values());
  }, [purchase.items]);

  const mutation = useMutation({
    mutationFn: () => {
      const items = productGroups
        .map((group) => ({
          productId: group.productId,
          quantity: Number(quantities[group.productId] || 0),
          reason: reasons[group.productId]?.trim() || undefined,
        }))
        .filter((item) => item.quantity > 0);
      return createPurchaseReturn({ purchaseId: purchase.id, supplierId: purchase.supplier.id, items });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchases", purchase.id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      toast.success("Return sent to supplier and stock reversed.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const hasAnyQuantity = productGroups.some((g) => Number(quantities[g.productId] || 0) > 0);

  const rows = productGroups.map((group) => (
    <Table.Tr key={group.productId}>
      <Table.Td fw={500}>{group.name}</Table.Td>
      <Table.Td ta="right">{group.purchasedQty}</Table.Td>
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
      <Text size="sm" c="dimmed">Choose how many units of each product are going back to the supplier.</Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th w={100} ta="right">Purchased</Table.Th>
            <Table.Th w={120}>Return Qty</Table.Th>
            <Table.Th>Reason</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed">
        IMEI-tracked units already sold can&apos;t be returned to the supplier — only unsold stock is eligible.
      </Text>

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
