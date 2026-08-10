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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? <PurchaseReturnDialogBody key={purchase.id} purchase={purchase} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
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

  // Group line items by product — a purchase can have multiple lines for
  // the same product (e.g. separate IMEI units), but the return API takes
  // at most one entry per product.
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>Return Items — {purchase.invoiceNo}</DialogTitle>
        <DialogDescription>Choose how many units of each product are going back to the supplier.</DialogDescription>
      </DialogHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="w-24 text-right">Purchased</TableHead>
            <TableHead className="w-28">Return Qty</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productGroups.map((group) => (
            <TableRow key={group.productId}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell className="text-right">{group.purchasedQty}</TableCell>
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

      <p className="text-xs text-muted-foreground">
        IMEI-tracked units already sold can&apos;t be returned to the supplier — only unsold stock is eligible.
      </p>

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
