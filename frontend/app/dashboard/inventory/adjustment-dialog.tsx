"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { createAdjustment, type InventoryItem } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api-client";
import { ADJUSTMENT_TYPE_ITEMS } from "@/lib/select-items";

const adjustmentFormSchema = z.object({
  type: z.enum(["increase", "decrease"]),
  quantity: z.string().trim().min(1, "Quantity is required.").refine((v) => Number(v) > 0, "Must be greater than zero."),
  reason: z.string().trim().min(1, "A reason is required."),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface AdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
}

export function AdjustmentDialog({ open, onOpenChange, item }: AdjustmentDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: { type: "increase", quantity: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ type: "increase", quantity: "", reason: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: AdjustmentFormValues) =>
      createAdjustment({ productId: item!.productId, type: values.type, quantity: Number(values.quantity), reason: values.reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-history", item?.productId] });
      toast.success("Stock adjustment recorded.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {item ? `${item.name} — currently ${item.quantity} in stock.` : "Manually correct inventory."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Adjustment type</label>
            <Select
              items={ADJUSTMENT_TYPE_ITEMS}
              value={watch("type")}
              onValueChange={(v) => setValue("type", v as "increase" | "decrease")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="adjustment-quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input id="adjustment-quantity" inputMode="numeric" aria-invalid={Boolean(errors.quantity)} {...register("quantity")} />
            {errors.quantity ? <p className="text-sm text-destructive">{errors.quantity.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="adjustment-reason" className="text-sm font-medium">
              Reason
            </label>
            <Textarea
              id="adjustment-reason"
              rows={2}
              placeholder="e.g. Stock count correction, damaged goods..."
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason ? <p className="text-sm text-destructive">{errors.reason.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Record adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
