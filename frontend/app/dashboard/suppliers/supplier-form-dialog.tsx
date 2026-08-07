"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { createSupplier, updateSupplier, type Supplier } from "@/lib/api/suppliers";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  contactPerson: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const isEditing = Boolean(supplier);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: "", phone: "", contactPerson: "", email: "", address: "", taxNumber: "", paymentTerms: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? "",
        phone: supplier?.phone ?? "",
        contactPerson: supplier?.contactPerson ?? "",
        email: supplier?.email ?? "",
        address: supplier?.address ?? "",
        taxNumber: supplier?.taxNumber ?? "",
        paymentTerms: supplier?.paymentTerms ?? "",
        status: supplier?.status ?? "active",
      });
    }
  }, [open, supplier, reset]);

  const mutation = useMutation({
    mutationFn: (values: SupplierFormValues) => {
      const payload = { ...values, email: values.email || undefined };
      return isEditing ? updateSupplier(supplier!.id, payload) : createSupplier(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(isEditing ? "Supplier updated." : "Supplier created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this supplier's details." : "Register a new supplier."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-name" className="text-sm font-medium">
                Name
              </label>
              <Input id="supplier-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-phone" className="text-sm font-medium">
                Phone
              </label>
              <Input id="supplier-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-contact" className="text-sm font-medium">
                Contact person
              </label>
              <Input id="supplier-contact" {...register("contactPerson")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="supplier-email" type="email" {...register("email")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="supplier-address" className="text-sm font-medium">
              Address
            </label>
            <Input id="supplier-address" {...register("address")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-tax-number" className="text-sm font-medium">
                Tax number
              </label>
              <Input id="supplier-tax-number" {...register("taxNumber")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-payment-terms" className="text-sm font-medium">
                Payment terms
              </label>
              <Input id="supplier-payment-terms" placeholder="e.g. Net 30" {...register("paymentTerms")} />
            </div>
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select
                items={STATUS_ITEMS}
                value={watch("status")}
                onValueChange={(v) => setValue("status", v as "active" | "inactive")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
