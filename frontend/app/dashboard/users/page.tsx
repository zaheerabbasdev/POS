"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Badge,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { fetchUsers, deleteUser, type UserListItem, type UserDetail } from "@/lib/api/users";
import { getApiErrorMessage } from "@/lib/api-client";
import { UserFormDialog } from "./user-form-dialog";

const PAGE_SIZE = 50;

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | undefined>(undefined);
  const [deactivatingUser, setDeactivatingUser] = useState<UserListItem | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", { search, page }],
    queryFn: () => fetchUsers({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated.");
      setDeactivatingUser(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingUser(undefined);
    setFormOpen(true);
  };

  const openEdit = (user: UserListItem) => {
    setEditingUser({ ...user, phone: null, profileImage: null, lastLogin: null });
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Users"
        description="Manage who can access the POS system and their roles."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add User
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search by name, username, or email…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle={search ? "No matching users" : "No users yet"}
          emptyDescription={
            search
              ? "No users match your search."
              : "Add a user."
          }
          columns={[
            {
              key: "username",
              header: "Username",
              render: (u) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {u.username}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (u) => (
                <Text size="sm" fw={500}>
                  {u.name}
                </Text>
              ),
            },
            {
              key: "email",
              header: "Email",
              render: (u) => (
                <Text size="sm" c="dimmed">
                  {u.email ?? "—"}
                </Text>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (u) => (
                <Badge variant="outline" color="gray" size="sm">
                  {u.role ?? "No role"}
                </Badge>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (u) => <StatusBadge status={u.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (u) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(u),
                    },
                    ...(u.status === "active"
                      ? [
                          {
                            label: "Deactivate",
                            icon: <Trash2 size={14} />,
                            onClick: () => setDeactivatingUser(u),
                            destructive: true,
                            dividerBefore: true,
                          },
                        ]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />

        {data && (
          <Box style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            <PaginationControls
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </Box>
        )}
      </Paper>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />

      <ConfirmModal
        opened={Boolean(deactivatingUser)}
        onClose={() => setDeactivatingUser(undefined)}
        title="Deactivate user?"
        description={`"${deactivatingUser?.name}" will no longer be able to log in. Their history is preserved and this can be reversed later.`}
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={() => deactivatingUser && deleteMutation.mutate(deactivatingUser.id)}
      />
    </Stack>
  );
}
