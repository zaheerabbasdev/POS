"use client";

import { useMemo } from "react";
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
  Button,
  Select,
  PasswordInput,
  SimpleGrid,
} from "@mantine/core";
import { createUser, updateUser, type UserDetail } from "@/lib/api/users";
import { fetchRoles } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

function buildFormSchema(isEditing: boolean) {
  return z.object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.string().trim().email("A valid email is required."),
    roleId: z.string().uuid("Select a role."),
    status: z.enum(["active", "inactive"]),
    username: isEditing ? z.string().optional() : z.string().trim().min(3, "Username must be at least 3 characters."),
    password: isEditing ? z.string().optional() : z.string().min(8, "Password must be at least 8 characters."),
  });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDetail;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={user ? "Edit User" : "Add User"}
      size="md"
    >
      {open && <UserFormDialogBody key={user?.id ?? "new"} user={user} onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function UserFormDialogBody({
  user,
  onOpenChange,
}: {
  user?: UserDetail;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = Boolean(user);
  const queryClient = useQueryClient();

  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  
  const roleOptions = useMemo(() => {
    return (roles ?? []).map((r) => ({ value: r.id, label: r.name }));
  }, [roles]);

  const statusOptions = Object.entries(STATUS_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(buildFormSchema(isEditing)),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      roleId: user?.roleId ?? "",
      status: user?.status ?? "active",
      username: user?.username ?? "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (isEditing) {
        return updateUser(user!.id, {
          name: values.name,
          email: values.email,
          roleId: values.roleId,
          status: values.status,
        });
      }
      return createUser({
        name: values.name,
        email: values.email,
        roleId: values.roleId,
        username: values.username!,
        password: values.password!,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(isEditing ? "User updated." : "User created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Stack gap="md">
        <TextInput
          label="Full name"
          withAsterisk
          {...register("name")}
          error={errors.name?.message}
        />

        {!isEditing ? (
          <SimpleGrid cols={2}>
            <TextInput
              label="Username"
              withAsterisk
              {...register("username")}
              error={errors.username?.message}
            />
            <PasswordInput
              label="Password"
              withAsterisk
              {...register("password")}
              error={errors.password?.message}
            />
          </SimpleGrid>
        ) : (
          <TextInput
            label="Username"
            value={user!.username}
            disabled
          />
        )}

        <TextInput
          label="Email"
          type="email"
          withAsterisk
          {...register("email")}
          error={errors.email?.message}
        />

        <Controller
          name="roleId"
          control={control}
          render={({ field }) => (
            <Select
              label="Role"
              placeholder="Select role"
              data={roleOptions}
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              error={errors.roleId?.message}
              withAsterisk
            />
          )}
        />

        {isEditing && (
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
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
            {isEditing ? "Save changes" : "Create user"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
