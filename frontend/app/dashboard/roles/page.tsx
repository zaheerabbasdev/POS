"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Shield, Trash2 } from "lucide-react";
import {
  Paper,
  Stack,
  Button,
  Text,
  Badge,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
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
    <Stack gap="lg">
      <PageHeader
        title="Roles"
        description="Manage roles and what each one is permitted to do."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Role
          </Button>
        }
      />

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={roles ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle="No roles found"
          emptyDescription="Add a role to get started."
          columns={[
            {
              key: "name",
              header: "Name",
              render: (r) => (
                <Text size="sm" fw={500}>
                  {r.name}
                </Text>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (r) => (
                <Text size="sm" c="dimmed">
                  {r.description ?? "—"}
                </Text>
              ),
            },
            {
              key: "permissions",
              header: "Permissions",
              render: (r) => (
                <Badge variant="light" color="gray" size="sm">
                  {r.permissions.length} permissions
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <ActionMenu
                  items={[
                    {
                      label: "Permissions",
                      icon: <Shield size={14} />,
                      onClick: () => setPermissionsRole(r),
                    },
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => {
                        setEditingRole(r);
                        setFormOpen(true);
                      },
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingRole(r),
                      destructive: true,
                      dividerBefore: true,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Paper>

      <RoleFormDialog open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
      <PermissionsDialog
        open={Boolean(permissionsRole)}
        onOpenChange={(open) => !open && setPermissionsRole(undefined)}
        role={permissionsRole}
      />

      <ConfirmModal
        opened={Boolean(deletingRole)}
        onClose={() => setDeletingRole(undefined)}
        title="Delete role?"
        description={`This will permanently delete "${deletingRole?.name}". Roles still assigned to users can't be deleted — reassign those users first.`}
        confirmLabel="Delete Role"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingRole && deleteMutation.mutate(deletingRole.id)}
      />
    </Stack>
  );
}
