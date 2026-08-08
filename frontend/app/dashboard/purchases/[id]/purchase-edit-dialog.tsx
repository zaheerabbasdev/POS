"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSuppliers } from "@/lib/api/suppliers";
import { updatePurchase, type PurchaseDetail } from "@/lib/api/purchases";
import { getApiErrorMessage } from "@/lib/api-client";

const purchaseEditSchema = z.object({
  supplierId: z.string().uuid("Select a supplier."),
  purchaseDate: z.string().min(1, "Purchase date is required."),
  remarks: z.string().trim().optional(),
});

type PurchaseEditValues = z.infer<typeof purchaseEditSchema>;

interface PurchaseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: PurchaseDetail;
}

/**
 * PATCH /purchases/{id} (API Spec Chapter 31.4) only allows editing
 * supplier, purchase date, and remarks — line items and payments are
 * immutable once posted, so unlike SupplierFormDialog this has no
 * "create" mode, it only ever edits.
 */
export function PurchaseEditDialog({ open, onOpenChange, purchase }: PurchaseEditDialogProps) {
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", { forSelect: true }],
    queryFn: () => fetchSuppliers({ status: "active", limit: 100 }),
    enabled: open,
  });
  const supplierItems = Object.fromEntries((suppliers?.data ?? []).map((s) => [s.id, s.name]));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseEditValues>({
    resolver: zodResolver(purchaseEditSchema),
    defaultValues: { supplierId: "", purchaseDate: "", remarks: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        supplierId: purchase.supplier.id,
        purchaseDate: purchase.purchaseDate.slice(0, 10),
        remarks: purchase.remarks ?? "",
      });
    }
  }, [open, purchase, reset]);

  const mutation = useMutation({
    mutationFn: (values: PurchaseEditValues) =>
      updatePurchase(purchase.id, {
        supplierId: values.supplierId,
        purchaseDate: values.purchaseDate,
        remarks: values.remarks || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["purchases", purchase.id] });
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
      toast.success("Purchase updated.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
          <DialogDescription>
            Update the supplier, date, or remarks. Line items and payments can&apos;t be changed here.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Supplier</label>
            <Select items={supplierItems} value={watch("supplierId")} onValueChange={(v) => setValue("supplierId", v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supplierId ? <p className="text-sm text-destructive">{errors.supplierId.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="purchase-date" className="text-sm font-medium">
              Purchase date
            </label>
            <Input id="purchase-date" type="date" aria-invalid={Boolean(errors.purchaseDate)} {...register("purchaseDate")} />
            {errors.purchaseDate ? <p className="text-sm text-destructive">{errors.purchaseDate.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="purchase-remarks" className="text-sm font-medium">
              Remarks
            </label>
            <Textarea id="purchase-remarks" rows={2} {...register("remarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
