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
import { createCustomer, updateCustomer, type Customer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api-client";
import { CUSTOMER_TYPE_ITEMS, STATUS_ITEMS } from "@/lib/select-items";

const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  customerType: z.enum(["REGULAR", "WHOLESALE", "VIP", "CORPORATE"]),
  creditLimit: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEditing = Boolean(customer);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", city: "", customerType: "REGULAR", creditLimit: "", notes: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        address: customer?.address ?? "",
        city: customer?.city ?? "",
        customerType: customer?.customerType ?? "REGULAR",
        creditLimit: customer?.creditLimit ?? "",
        notes: customer?.notes ?? "",
        status: customer?.status ?? "active",
      });
    }
  }, [open, customer, reset]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address,
        city: values.city,
        customerType: values.customerType,
        notes: values.notes,
        status: values.status,
        ...(values.creditLimit ? { creditLimit: Number(values.creditLimit) } : {}),
      };
      return isEditing ? updateCustomer(customer!.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(isEditing ? "Customer updated." : "Customer created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this customer's details." : "Register a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-name" className="text-sm font-medium">
                Name
              </label>
              <Input id="customer-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-phone" className="text-sm font-medium">
                Phone
              </label>
              <Input id="customer-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-email" className="text-sm font-medium">
              Email
            </label>
            <Input id="customer-email" type="email" {...register("email")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-address" className="text-sm font-medium">
                Address
              </label>
              <Input id="customer-address" {...register("address")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-city" className="text-sm font-medium">
                City
              </label>
              <Input id="customer-city" {...register("city")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Customer type</label>
              <Select
                items={CUSTOMER_TYPE_ITEMS}
                value={watch("customerType")}
                onValueChange={(v) => setValue("customerType", v as CustomerFormValues["customerType"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_TYPE_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer-credit-limit" className="text-sm font-medium">
                Credit limit
              </label>
              <Input id="customer-credit-limit" inputMode="decimal" {...register("creditLimit")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer-notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea id="customer-notes" rows={2} {...register("notes")} />
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
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
