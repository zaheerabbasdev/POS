"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { createBrand, updateBrand, type Brand } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const brandFormSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required."),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

interface BrandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}

export function BrandFormDialog({ open, onOpenChange, brand }: BrandFormDialogProps) {
  const isEditing = Boolean(brand);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: brand?.name ?? "", description: brand?.description ?? "", status: brand?.status ?? "active" });
    }
  }, [open, brand, reset]);

  const mutation = useMutation({
    mutationFn: (values: BrandFormValues) =>
      isEditing ? updateBrand(brand!.id, values) : createBrand(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(isEditing ? "Brand updated." : "Brand created.");
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
      title={isEditing ? "Edit Brand" : "Add Brand"}
      size="md"
    >
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <Stack gap="md">
          <TextInput
            label="Name"
            withAsterisk
            {...register("name")}
            error={errors.name?.message}
          />

          <Textarea
            label="Description"
            minRows={3}
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
              {isEditing ? "Save changes" : "Create brand"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
