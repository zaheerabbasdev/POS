"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Add Role"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this role's name and description." : "Create a new role. Assign permissions after creating it."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="role-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="role-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="role-description" rows={2} {...register("description")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
