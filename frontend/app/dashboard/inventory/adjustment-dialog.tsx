"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
} from "@mantine/core";
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

  const adjustmentTypeData = Object.entries(ADJUSTMENT_TYPE_ITEMS).map(([value, label]) => ({ value, label }));

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>Adjust Stock</Text>}
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {item ? `${item.name} — currently ${item.quantity} in stock.` : "Manually correct inventory."}
        </Text>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <Stack gap="md">
            <Select
              label="Adjustment type"
              data={adjustmentTypeData}
              value={watch("type")}
              onChange={(v) => setValue("type", v as "increase" | "decrease")}
            />

            <TextInput
              label="Quantity"
              inputMode="numeric"
              {...register("quantity")}
              error={errors.quantity?.message}
            />

            <Textarea
              label="Reason"
              rows={2}
              placeholder="e.g. Stock count correction, damaged goods..."
              {...register("reason")}
              error={errors.reason?.message}
            />

            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                Record adjustment
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
