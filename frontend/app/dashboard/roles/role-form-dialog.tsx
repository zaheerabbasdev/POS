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
  Group,
  TextInput,
  Textarea,
  Button,
} from "@mantine/core";
import { createRole, updateRole, type Role } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";

const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Role name is required."),
  description: z.string().trim().optional(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEditing = Boolean(role);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ name: role?.name ?? "", description: role?.description ?? "" });
    }
  }, [open, role, reset]);

  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) => (isEditing ? updateRole(role!.id, values) : createRole(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success(isEditing ? "Role updated." : "Role created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Edit Role" : "Add Role"}
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
            minRows={2}
            {...register("description")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
              {isEditing ? "Save changes" : "Create role"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
