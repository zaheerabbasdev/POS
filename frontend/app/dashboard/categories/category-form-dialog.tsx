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
import { createCategory, updateCategory, type Category } from "@/lib/api/categories";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}

export function CategoryFormDialog({ open, onOpenChange, category }: CategoryFormDialogProps) {
  const isEditing = Boolean(category);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        description: category?.description ?? "",
        status: category?.status ?? "active",
      });
    }
  }, [open, category, reset]);

  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      isEditing ? updateCategory(category!.id, values) : createCategory(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(isEditing ? "Category updated." : "Category created.");
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
      title={isEditing ? "Edit Category" : "Add Category"}
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
              {isEditing ? "Save changes" : "Create category"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
