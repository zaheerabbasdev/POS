"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Button,
  Select,
} from "@mantine/core";
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

export function PurchaseEditDialog({ open, onOpenChange, purchase }: PurchaseEditDialogProps) {
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", { forSelect: true }],
    queryFn: () => fetchSuppliers({ status: "active", limit: 100 }),
    enabled: open,
  });

  const supplierOptions = useMemo(() => {
    return (suppliers?.data ?? []).map((s) => ({ value: s.id, label: s.name }));
  }, [suppliers]);

  const {
    register,
    handleSubmit,
    reset,
    control,
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
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title="Edit Purchase"
      size="md"
    >
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack gap="md">
          <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
              <Select
                label="Supplier"
                placeholder="Select a supplier"
                data={supplierOptions}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
                error={errors.supplierId?.message}
                withAsterisk
              />
            )}
          />

          <TextInput
            label="Purchase date"
            type="date"
            withAsterisk
            {...register("purchaseDate")}
            error={errors.purchaseDate?.message}
          />

          <Textarea
            label="Remarks"
            minRows={2}
            {...register("remarks")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
