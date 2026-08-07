"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchProducts } from "@/lib/api/products";
import { addRepairItem } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api-client";

interface AddPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: string;
}

export function AddPartDialog({ open, onOpenChange, repairId }: AddPartDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? <AddPartDialogBody repairId={repairId} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function AddPartDialogBody({ repairId, onOpenChange }: { repairId: string; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", { forSelect: true }],
    queryFn: () => fetchProducts({ status: "active", limit: 100 }),
  });
  const productItems = useMemo(
    () => Object.fromEntries((products?.data ?? []).map((p) => [p.id, `${p.name} (${p.sku})`])),
    [products],
  );

  const mutation = useMutation({
    mutationFn: () => addRepairItem(repairId, { productId, quantity: Number(quantity), unitPrice: Number(unitPrice) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repairs", repairId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Part recorded and stock updated.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record Part Used</DialogTitle>
        <DialogDescription>Deducts the quantity from stock and adds it to this repair.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Part / Product</label>
          <Select items={productItems} value={productId} onValueChange={(v) => setProductId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products?.data.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="part-quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input id="part-quantity" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="part-unit-price" className="text-sm font-medium">
              Unit Price
            </label>
            <Input id="part-unit-price" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          disabled={!productId || !quantity || !unitPrice || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Recording..." : "Add Part"}
        </Button>
      </DialogFooter>
    </>
  );
}
