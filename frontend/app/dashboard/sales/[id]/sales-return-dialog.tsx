"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Mounted only while open, keyed on the sale — state initializes
            fresh every time it's opened instead of needing a reset effect. */}
        {open ? <SalesReturnDialogBody key={sale.id} sale={sale} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SalesReturnDialogBody({ sale, onOpenChange }: { sale: SaleDetail; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [refundMethod, setRefundMethod] = useState("cash");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});

  // Group line items by product — a sale can have multiple lines for the
  // same product (e.g. separate IMEI units), but the return API takes at
  // most one entry per product.
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
      return createSalesReturn({ saleId: sale.id, items, refundMethod });
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>Return Items — {sale.invoiceNumber}</DialogTitle>
        <DialogDescription>Choose how many units of each product the customer is returning.</DialogDescription>
      </DialogHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="w-24 text-right">Sold</TableHead>
            <TableHead className="w-28">Return Qty</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productGroups.map((group) => (
            <TableRow key={group.productId}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell className="text-right">{group.soldQty}</TableCell>
              <TableCell>
                <Input
                  inputMode="numeric"
                  className="w-20"
                  placeholder="0"
                  value={quantities[group.productId] ?? ""}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [group.productId]: e.target.value }))}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Optional"
                  value={reasons[group.productId] ?? ""}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [group.productId]: e.target.value }))}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Refund Method</label>
        <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v ?? "cash")} items={PAYMENT_METHOD_ITEMS}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={!hasAnyQuantity || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Processing..." : "Process Return"}
        </Button>
      </DialogFooter>
    </>
  );
}
