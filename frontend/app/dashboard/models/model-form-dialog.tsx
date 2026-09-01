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
import { createProductModel, updateProductModel, type ProductModel } from "@/lib/api/product-models";
import { fetchBrands } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const modelFormSchema = z.object({
  name: z.string().trim().min(1, "Model name is required."),
  brandId: z.string().uuid("Select a brand."),
  releaseYear: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type ModelFormValues = z.infer<typeof modelFormSchema>;

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: ProductModel;
}

export function ModelFormDialog({ open, onOpenChange, model }: ModelFormDialogProps) {
  const isEditing = Boolean(model);
  const queryClient = useQueryClient();

  const { data: brands } = useQuery({
    queryKey: ["brands", { forSelect: true }],
    queryFn: () => fetchBrands({ status: "active", limit: 100 }),
    enabled: open,
  });

  const brandOptions = useMemo(() => {
    return (brands?.data ?? []).map((b) => ({ value: b.id, label: b.name }));
  }, [brands]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { name: "", brandId: "", releaseYear: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: model?.name ?? "",
        brandId: model?.brandId ?? "",
        releaseYear: model?.releaseYear ? String(model.releaseYear) : "",
        description: model?.description ?? "",
        status: model?.status ?? "active",
      });
    }
  }, [open, model, reset]);

  const mutation = useMutation({
    mutationFn: (values: ModelFormValues) => {
      const payload = {
        name: values.name,
        brandId: values.brandId,
        description: values.description,
        status: values.status,
        ...(values.releaseYear ? { releaseYear: Number(values.releaseYear) } : {}),
      };
      return isEditing ? updateProductModel(model!.id, payload) : createProductModel(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-models"] });
      toast.success(isEditing ? "Model updated." : "Model created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const statusOptions = Object.entries(STATUS_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Edit Model" : "Add Model"}
      size="md"
    >
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. iPhone 15 Pro"
            withAsterisk
            {...register("name")}
            error={errors.name?.message}
          />

          <Controller
            name="brandId"
            control={control}
            render={({ field }) => (
              <Select
                label="Brand"
                placeholder="Select a brand"
                data={brandOptions}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
                error={errors.brandId?.message}
                withAsterisk
              />
            )}
          />

          <TextInput
            label="Release year"
            placeholder="e.g. 2023"
            inputMode="numeric"
            {...register("releaseYear")}
          />

          <Textarea
            label="Description"
            minRows={2}
            {...register("description")}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                label="Status"
                data={statusOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
              {isEditing ? "Save changes" : "Create model"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
