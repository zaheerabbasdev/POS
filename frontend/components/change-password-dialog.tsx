"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, Stack, PasswordInput, Button, Group, Text } from "@mantine/core";
import { changePassword } from "@/lib/api/auth";
import { getApiErrorMessage } from "@/lib/api-client";

// Zod schema — unchanged from original
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      reset();
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      title="Change Password"
      size="sm"
      centered
    >
      <Text size="sm" c="dimmed" mb="md">
        Choose a new password for your account.
      </Text>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
      >
        <Stack gap="sm">
          <PasswordInput
            id="current-password"
            label="Current password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />

          <PasswordInput
            id="new-password"
            label="New password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <PasswordInput
            id="confirm-new-password"
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Group justify="flex-end" gap="xs" mt="xs">
            <Button variant="subtle" color="gray" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
