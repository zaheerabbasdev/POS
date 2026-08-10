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
import { createCustomer, type Customer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api-client";

const quickAddCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
});

type QuickAddCustomerValues = z.infer<typeof quickAddCustomerSchema>;

interface QuickAddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly-created customer so the checkout screen can select them immediately. */
  onCreated: (customer: Customer) => void;
}

/**
 * A stripped-down customer form (just name + phone, the only two required
 * fields) so a cashier can register a walk-in customer without leaving the
 * POS screen. Triggered by a dedicated "Add New Customer" button next to
 * the checkout's Customer field (not a dropdown option) and opens as a
 * modal. The full Customer form (email/address/credit limit/etc.) is still
 * on the Customers page for filling in later.
 */
export function QuickAddCustomerDialog({ open, onOpenChange, onCreated }: QuickAddCustomerDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddCustomerValues>({
    resolver: zodResolver(quickAddCustomerSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (open) reset({ name: "", phone: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: QuickAddCustomerValues) => createCustomer(values),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`"${customer.name}" added.`);
      onCreated(customer);
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
          <DialogDescription>
            Quick add for checkout — fill in the rest (email, address, credit limit) later from the Customers page.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-customer-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="quick-customer-name" autoFocus aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-customer-phone" className="text-sm font-medium">
              Phone
            </label>
            <Input id="quick-customer-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
