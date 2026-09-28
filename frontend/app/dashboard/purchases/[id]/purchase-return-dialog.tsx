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
  Checkbox,
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

interface ProductGroup {
  productId: string;
  name: string;
  purchasedQty: number;
  remainingQty: number;
  isPhone: boolean;
  availableImeis: string[];
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
  const [pickedImeis, setPickedImeis] = useState<Record<string, string[]>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const productGroups = useMemo(() => {
    const returned = new Map(purchase.returnedQuantities.map((r) => [r.productId, r.quantity]));
    const map = new Map<string, ProductGroup>();
    for (const item of purchase.items) {
      const group = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        purchasedQty: 0,
        remainingQty: 0,
        isPhone: false,
        availableImeis: [],
      };
      group.purchasedQty += item.quantity;
      group.isPhone ||= item.imeis.length > 0 || item.availableImeis.length > 0;
      for (const imei of item.availableImeis) if (!group.availableImeis.includes(imei)) group.availableImeis.push(imei);
      map.set(item.productId, group);
    }
    for (const group of map.values()) {
      group.remainingQty = Math.max(0, group.purchasedQty - (returned.get(group.productId) ?? 0));
    }
    return Array.from(map.values());
  }, [purchase.items, purchase.returnedQuantities]);

  const quantityFor = (group: ProductGroup) =>
    group.isPhone ? (pickedImeis[group.productId]?.length ?? 0) : Number(quantities[group.productId] || 0);

  const tooMany = productGroups.find((g) => !g.isPhone && quantityFor(g) > g.remainingQty);

  const mutation = useMutation({
    mutationFn: () => {
      const items = productGroups
        .map((group) => ({
          productId: group.productId,
          quantity: quantityFor(group),
          reason: reasons[group.productId]?.trim() || undefined,
          imeis: group.isPhone ? pickedImeis[group.productId] : undefined,
        }))
        .filter((item) => item.quantity > 0);
      return createPurchaseReturn({ purchaseId: purchase.id, supplierId: purchase.supplier.id, items });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchases", purchase.id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Return sent to supplier and stock reversed.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const hasAnyQuantity = productGroups.some((g) => quantityFor(g) > 0);

  const toggleImei = (productId: string, imei: string, checked: boolean) =>
    setPickedImeis((prev) => {
      const current = prev[productId] ?? [];
      return { ...prev, [productId]: checked ? [...current, imei] : current.filter((i) => i !== imei) };
    });

  const rows = productGroups.map((group) => (
    <Table.Tr key={group.productId}>
      <Table.Td fw={500}>{group.name}</Table.Td>
      <Table.Td ta="right">{group.purchasedQty}</Table.Td>
      <Table.Td ta="right">{group.remainingQty}</Table.Td>
      <Table.Td>
        {group.isPhone ? (
          group.availableImeis.length === 0 ? (
            <Text size="xs" c="dimmed">None in stock</Text>
          ) : (
            <Stack gap={4}>
              {group.availableImeis.map((imei) => (
                <Checkbox
                  key={imei}
                  size="xs"
                  label={imei}
                  checked={pickedImeis[group.productId]?.includes(imei) ?? false}
                  onChange={(e) => toggleImei(group.productId, imei, e.currentTarget.checked)}
                />
              ))}
            </Stack>
          )
        ) : (
          <TextInput
            inputMode="numeric"
            w={80}
            placeholder="0"
            disabled={group.remainingQty === 0}
            value={quantities[group.productId] ?? ""}
            onChange={(e) => setQuantities((prev) => ({ ...prev, [group.productId]: e.currentTarget.value }))}
          />
        )}
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
      <Text size="sm" c="dimmed">
        Choose what is going back to the supplier. For phones, tick the exact IMEI being sent back.
      </Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th w={100} ta="right">Purchased</Table.Th>
            <Table.Th w={110} ta="right">Not returned</Table.Th>
            <Table.Th w={200}>Return</Table.Th>
            <Table.Th>Reason</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>

      {tooMany && (
        <Text size="sm" c="red">
          Only {tooMany.remainingQty} of &quot;{tooMany.name}&quot; can still be returned.
        </Text>
      )}

      <Text size="xs" c="dimmed">
        Only stock still on the shelf can go back — units already sold can&apos;t be returned to the supplier.
        The return is taken off what you owe the supplier for this purchase.
      </Text>

      <Group justify="flex-end" mt="md">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={!hasAnyQuantity || !!tooMany || mutation.isPending}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
          color="indigo"
        >
          Process Return
        </Button>
      </Group>
    </Stack>
  );
}
