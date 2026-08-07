"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchPermissions, type Permission } from "@/lib/api/permissions";
import { assignPermissions, type Role } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: Role;
}

export function PermissionsDialog({ open, onOpenChange, role }: PermissionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* Keyed on role.id so `selected` initializes fresh per role via
            useState's initializer, instead of syncing it with an effect. */}
        {role ? (
          <PermissionsDialogBody key={role.id} role={role} onOpenChange={onOpenChange} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialogBody({ role, onOpenChange }: { role: Role; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.permissions));

  const { data: permissions } = useQuery({ queryKey: ["permissions"], queryFn: fetchPermissions });

  const grouped = useMemo(() => {
    const byModule = new Map<string, Permission[]>();
    for (const permission of permissions ?? []) {
      const list = byModule.get(permission.module) ?? [];
      list.push(permission);
      byModule.set(permission.module, list);
    }
    return Array.from(byModule.entries());
  }, [permissions]);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const mutation = useMutation({
    mutationFn: () => assignPermissions(role.id, Array.from(selected)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Permissions updated.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Permissions — {role.name}</DialogTitle>
        <DialogDescription>Choose exactly what this role can do. Replaces the full permission set for this role.</DialogDescription>
      </DialogHeader>

      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {grouped.map(([module, modulePermissions]) => (
          <div key={module} className="flex flex-col gap-2">
            <span className="text-sm font-medium text-muted-foreground">{module}</span>
            <div className="grid grid-cols-2 gap-2">
              {modulePermissions.map((permission) => (
                <label key={permission.code} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selected.has(permission.code)} onCheckedChange={() => toggle(permission.code)} />
                  {permission.code}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving..." : "Save permissions"}
        </Button>
      </DialogFooter>
    </>
  );
}
