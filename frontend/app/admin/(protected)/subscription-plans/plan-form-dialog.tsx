"use client";

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
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/lib/api/subscription-plans";
import { getApiErrorMessage } from "@/lib/api-client";

const BILLING_INTERVAL_ITEMS: Record<BillingInterval, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  CUSTOM: "Custom",
};

const planFormSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required."),
  description: z.string().trim().optional(),
  price: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Price cannot be negative."),
  currency: z.string().trim().min(1, "Currency is required."),
  billingInterval: z.enum(["MONTHLY", "YEARLY", "CUSTOM"]),
  durationDays: z
    .string()
    .trim()
    .min(1, "Duration is required.")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, "Duration must be zero or more days."),
  isActive: z.boolean(),
  // Blank = unlimited (matches the backend's null-means-unlimited convention).
  maxUsers: z.string().trim().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) > 0), "Must be a positive whole number, or blank for unlimited."),
  maxProducts: z.string().trim().refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) > 0), "Must be a positive whole number, or blank for unlimited."),
});

function limitFieldToPayload(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

type PlanFormValues = z.infer<typeof planFormSchema>;

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan;
}

export function PlanFormDialog({ open, onOpenChange, plan }: PlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? <PlanFormDialogBody key={plan?.id ?? "new"} plan={plan} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function PlanFormDialogBody({ plan, onOpenChange }: { plan?: SubscriptionPlan; onOpenChange: (open: boolean) => void }) {
  const isEditing = Boolean(plan);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      price: plan ? String(plan.price) : "0",
      currency: plan?.currency ?? "USD",
      billingInterval: plan?.billingInterval ?? "MONTHLY",
      durationDays: plan ? String(plan.durationDays) : "30",
      isActive: plan?.isActive ?? true,
      maxUsers: plan?.maxUsers != null ? String(plan.maxUsers) : "",
      maxProducts: plan?.maxProducts != null ? String(plan.maxProducts) : "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: PlanFormValues) => {
      const payload = {
        ...values,
        price: Number(values.price),
        durationDays: Number(values.durationDays),
        maxUsers: limitFieldToPayload(values.maxUsers),
        maxProducts: limitFieldToPayload(values.maxProducts),
      };
      return isEditing ? updateSubscriptionPlan(plan!.id, payload) : createSubscriptionPlan(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "subscription-plans"] });
      toast.success(isEditing ? "Plan updated." : "Plan created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Plan" : "Create Plan"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Update this subscription plan." : "Add a new plan shops can subscribe to."}
        </DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-name" className="text-sm font-medium">
            Name
          </label>
          <Input id="plan-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-description" className="text-sm font-medium">
            Description
          </label>
          <Textarea id="plan-description" rows={2} {...register("description")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-price" className="text-sm font-medium">
              Price
            </label>
            <Input id="plan-price" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.price)} {...register("price")} />
            {errors.price ? <p className="text-sm text-destructive">{errors.price.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-currency" className="text-sm font-medium">
              Currency
            </label>
            <Input id="plan-currency" {...register("currency")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Billing interval</label>
            <Select
              items={BILLING_INTERVAL_ITEMS}
              value={watch("billingInterval")}
              onValueChange={(v) => setValue("billingInterval", (v as BillingInterval) ?? "MONTHLY")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_INTERVAL_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-duration" className="text-sm font-medium">
              Duration (days)
            </label>
            <Input
              id="plan-duration"
              type="number"
              min="0"
              aria-invalid={Boolean(errors.durationDays)}
              {...register("durationDays")}
            />
            {errors.durationDays ? <p className="text-sm text-destructive">{errors.durationDays.message}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-max-users" className="text-sm font-medium">
              Max users
            </label>
            <Input
              id="plan-max-users"
              type="number"
              min="1"
              placeholder="Unlimited"
              aria-invalid={Boolean(errors.maxUsers)}
              {...register("maxUsers")}
            />
            {errors.maxUsers ? (
              <p className="text-sm text-destructive">{errors.maxUsers.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Blank = unlimited.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan-max-products" className="text-sm font-medium">
              Max products
            </label>
            <Input
              id="plan-max-products"
              type="number"
              min="1"
              placeholder="Unlimited"
              aria-invalid={Boolean(errors.maxProducts)}
              {...register("maxProducts")}
            />
            {errors.maxProducts ? (
              <p className="text-sm text-destructive">{errors.maxProducts.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Blank = unlimited.</p>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={{ active: "Active", inactive: "Inactive" }}
              value={watch("isActive") ? "active" : "inactive"}
              onValueChange={(v) => setValue("isActive", v === "active")}
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
            {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create plan"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
