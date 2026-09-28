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
  Checkbox,
  Paper,
} from "@mantine/core";
import { createSalesReturn } from "@/lib/api/sales-returns";
import type { SaleDetail } from "@/lib/api/sales";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";
import { MoneyText } from "@/components/currency-display";

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

type SaleLine = SaleDetail["items"][number];

interface ProductGroup {
  productId: string;
  name: string;
  soldQty: number;
  remainingQty: number;
  // Lines sorted the same way the server allocates returns (by line id).
  lines: SaleLine[];
  // Phones only: the IMEIs still with the customer.
  heldImeis: string[];
}

function SalesReturnDialogBody({ sale, onOpenChange }: { sale: SaleDetail; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [refundMethod, setRefundMethod] = useState<string | null>("cash");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [pickedImeis, setPickedImeis] = useState<Record<string, string[]>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const productGroups = useMemo(() => {
    const map = new Map<string, ProductGroup>();
    for (const item of [...sale.items].sort((a, b) => a.id.localeCompare(b.id))) {
      const group = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        soldQty: 0,
        remainingQty: 0,
        lines: [],
        heldImeis: [],
      };
      group.soldQty += item.quantity;
      group.remainingQty += item.quantity - item.returnedQuantity;
      group.lines.push(item);
      if (item.imei && item.returnedQuantity === 0) group.heldImeis.push(item.imei);
      map.set(item.productId, group);
    }
    return Array.from(map.values());
  }, [sale.items]);

  // What each unit actually cost the customer — its line total spread per
  // unit, scaled by the invoice-level discount. Mirrors the server's rule so
  // the preview matches what gets refunded.
  const unitValues = useMemo(() => {
    const sumLineTotals = sale.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const factor = sumLineTotals > 0 ? Number(sale.totalAmount) / sumLineTotals : 0;
    return new Map(
      sale.items.map((item) => [item.id, item.quantity > 0 ? (Number(item.lineTotal) / item.quantity) * factor : 0]),
    );
  }, [sale.items, sale.totalAmount]);

  const isPhone = (group: ProductGroup) => group.lines.some((line) => line.imei);
  const quantityFor = (group: ProductGroup) =>
    isPhone(group) ? (pickedImeis[group.productId]?.length ?? 0) : Number(quantities[group.productId] || 0);

  const returnValue = productGroups.reduce((total, group) => {
    if (isPhone(group)) {
      const picked = new Set(pickedImeis[group.productId] ?? []);
      return total + group.lines.filter((l) => l.imei && picked.has(l.imei)).reduce((s, l) => s + (unitValues.get(l.id) ?? 0), 0);
    }
    let remaining = quantityFor(group);
    for (const line of group.lines) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, line.quantity - line.returnedQuantity);
      if (take <= 0) continue;
      total += take * (unitValues.get(line.id) ?? 0);
      remaining -= take;
    }
    return total;
  }, 0);
  const owed = Number(sale.dueAmount);
  const creditApplied = Math.min(returnValue, owed);
  const cashBack = Math.min(returnValue - creditApplied, Number(sale.paidAmount));

  const tooMany = productGroups.find((g) => !isPhone(g) && quantityFor(g) > g.remainingQty);

  const mutation = useMutation({
    mutationFn: () => {
      const items = productGroups
        .map((group) => ({
          productId: group.productId,
          quantity: quantityFor(group),
          reason: reasons[group.productId]?.trim() || undefined,
          imeis: isPhone(group) ? pickedImeis[group.productId] : undefined,
        }))
        .filter((item) => item.quantity > 0);
      return createSalesReturn({ saleId: sale.id, items, refundMethod: refundMethod ?? "cash" });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["sales", sale.id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      const parts = [
        result.cashRefunded > 0 ? `${result.cashRefunded.toFixed(2)} paid back` : null,
        result.creditApplied > 0 ? `${result.creditApplied.toFixed(2)} taken off what the customer owes` : null,
      ].filter(Boolean);
      toast.success(`Return processed${parts.length ? ` — ${parts.join(", ")}` : ""}.`);
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const hasAnyQuantity = productGroups.some((g) => quantityFor(g) > 0);

  const refundOptions = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  const toggleImei = (productId: string, imei: string, checked: boolean) =>
    setPickedImeis((prev) => {
      const current = prev[productId] ?? [];
      return { ...prev, [productId]: checked ? [...current, imei] : current.filter((i) => i !== imei) };
    });

  const rows = productGroups.map((group) => (
    <Table.Tr key={group.productId}>
      <Table.Td fw={500}>{group.name}</Table.Td>
      <Table.Td ta="right">{group.soldQty}</Table.Td>
      <Table.Td ta="right">{group.remainingQty}</Table.Td>
      <Table.Td>
        {isPhone(group) ? (
          group.heldImeis.length === 0 ? (
            <Text size="xs" c="dimmed">All returned</Text>
          ) : (
            <Stack gap={4}>
              {group.heldImeis.map((imei) => (
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
        Choose what the customer is bringing back. For phones, tick the exact IMEI being returned.
      </Text>

      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th w={80} ta="right">Sold</Table.Th>
            <Table.Th w={110} ta="right">Can return</Table.Th>
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

      {hasAnyQuantity && !tooMany && (
        <Paper withBorder p="sm" radius="md">
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm">Value of returned items</Text>
              <Text size="sm" fw={600}><MoneyText value={returnValue} /></Text>
            </Group>
            {creditApplied > 0 && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Taken off what the customer still owes</Text>
                <Text size="sm"><MoneyText value={creditApplied} /></Text>
              </Group>
            )}
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Money to give back</Text>
              <Text size="sm" fw={600}><MoneyText value={cashBack} /></Text>
            </Group>
          </Stack>
        </Paper>
      )}

      <Select
        label="Refund Method"
        description="How the money is given back (only used if there's money to give back)."
        data={refundOptions}
        value={refundMethod}
        onChange={(v) => setRefundMethod(v)}
      />

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
