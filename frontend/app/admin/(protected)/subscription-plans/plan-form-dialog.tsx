"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Button,
  Group,
  Text,
} from "@mantine/core";
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  type BillingInterval,
  type SubscriptionPlan,
} from "@/lib/api/subscription-plans";
import { getApiErrorMessage } from "@/lib/api-client";

const BILLING_INTERVAL_ITEMS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "CUSTOM", label: "Custom" },
];

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
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>{plan ? "Edit Plan" : "Create Plan"}</Text>}
      size="lg"
    >
      {open ? <PlanFormDialogBody key={plan?.id ?? "new"} plan={plan} onOpenChange={onOpenChange} /> : null}
    </Modal>
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
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {isEditing ? "Update this subscription plan." : "Add a new plan shops can subscribe to."}
      </Text>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack gap="md">
          <TextInput
            label="Name"
            {...register("name")}
            error={errors.name?.message}
          />

          <Textarea
            label="Description"
            rows={2}
            {...register("description")}
            error={errors.description?.message}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Price"
              type="number"
              step="0.01"
              min="0"
              {...register("price")}
              error={errors.price?.message}
            />
            <TextInput
              label="Currency"
              {...register("currency")}
              error={errors.currency?.message}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Billing interval"
              data={BILLING_INTERVAL_ITEMS}
              value={watch("billingInterval")}
              onChange={(v) => setValue("billingInterval", (v as BillingInterval) ?? "MONTHLY")}
            />
            <TextInput
              label="Duration (days)"
              type="number"
              min="0"
              {...register("durationDays")}
              error={errors.durationDays?.message}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Max users"
              type="number"
              min="1"
              placeholder="Unlimited"
              {...register("maxUsers")}
              error={errors.maxUsers?.message || "Blank = unlimited."}
            />
            <TextInput
              label="Max products"
              type="number"
              min="1"
              placeholder="Unlimited"
              {...register("maxProducts")}
              error={errors.maxProducts?.message || "Blank = unlimited."}
            />
          </SimpleGrid>

          {isEditing ? (
            <Select
              label="Status"
              data={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              value={watch("isActive") ? "active" : "inactive"}
              onChange={(v) => setValue("isActive", v === "active")}
            />
          ) : null}

          <Group justify="flex-end" mt="md">
            <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
              {isEditing ? "Save changes" : "Create plan"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
