"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchRoles, deleteRole, type Role } from "@/lib/api/roles";
import { getApiErrorMessage } from "@/lib/api-client";
import { RoleFormDialog } from "./role-form-dialog";
import { PermissionsDialog } from "./permissions-dialog";

export default function RolesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);
  const [permissionsRole, setPermissionsRole] = useState<Role | undefined>(undefined);
  const [deletingRole, setDeletingRole] = useState<Role | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role deleted.");
      setDeletingRole(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingRole(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">Manage roles and what each one is permitted to do.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Role
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : roles && roles.length > 0 ? (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">{role.description ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setPermissionsRole(role)}>
                        Permissions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRole(role);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingRole(role)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No roles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
      <PermissionsDialog
        open={Boolean(permissionsRole)}
        onOpenChange={(open) => !open && setPermissionsRole(undefined)}
        role={permissionsRole}
      />

      <ConfirmDialog
        open={Boolean(deletingRole)}
        onOpenChange={(open) => !open && setDeletingRole(undefined)}
        title="Delete role?"
        description={`This will permanently delete "${deletingRole?.name}". Roles still assigned to users can't be deleted — reassign those users first.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingRole && deleteMutation.mutate(deletingRole.id)}
      />
    </div>
  );
}
