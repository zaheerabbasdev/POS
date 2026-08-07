"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createUser, updateUser, type UserDetail } from "@/lib/api/users";
import { fetchRoles } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

// Username/password are only collected (and required) when creating — built
// as one schema whose shape stays constant across modes (both branches
// resolve to `string | undefined`) so a single useForm<FormValues> type
// works for both; only the runtime validation strictness changes.
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed on the user identity so defaultValues initialize fresh per
            open/user via useForm's initializer, instead of syncing them with
            a reset()-in-effect that can re-fire (e.g. once the roles query
            resolves) and wipe out fields already filled in. */}
        {open ? <UserFormDialogBody key={user?.id ?? "new"} user={user} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
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
  const roleItems = useMemo(() => Object.fromEntries((roles ?? []).map((r) => [r.id, r.name])), [roles]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Update this user's details." : "Create a new system user with a role."}
        </DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-name" className="text-sm font-medium">
            Full name
          </label>
          <Input id="user-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-username" className="text-sm font-medium">
                Username
              </label>
              <Input id="user-username" aria-invalid={Boolean(errors.username)} {...register("username")} />
              {errors.username ? <p className="text-sm text-destructive">{errors.username.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-password" className="text-sm font-medium">
                Password
              </label>
              <Input id="user-password" type="password" aria-invalid={Boolean(errors.password)} {...register("password")} />
              {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Username</span>
            <Input value={user!.username} disabled />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="user-email" className="text-sm font-medium">
            Email
          </label>
          <Input id="user-email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Role</label>
          <Select items={roleItems} value={watch("roleId")} onValueChange={(v) => setValue("roleId", v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.roleId ? <p className="text-sm text-destructive">{errors.roleId.message}</p> : null}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={STATUS_ITEMS}
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as "active" | "inactive")}
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
            {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create user"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
