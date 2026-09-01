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
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { fetchCategories, deleteCategory, type Category } from "@/lib/api/categories";
import { getApiErrorMessage } from "@/lib/api-client";
import { CategoryFormDialog } from "./category-form-dialog";

const PAGE_SIZE = 50;

export default function CategoriesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);
  const [deletingCategory, setDeletingCategory] = useState<Category | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["categories", { search, page }],
    queryFn: () => fetchCategories({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted.");
      setDeletingCategory(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingCategory(undefined);
    setFormOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Categories"
        description="Organize products into categories."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Category
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search categories…"
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
          emptyTitle={search ? "No matching categories" : "No categories yet"}
          emptyDescription={
            search
              ? "No categories match your search."
              : "Add your first category."
          }
          columns={[
            {
              key: "name",
              header: "Name",
              render: (c) => (
                <Text size="sm" fw={500}>
                  {c.name}
                </Text>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (c) => (
                <Text size="sm" c="dimmed">
                  {c.description ?? "—"}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (c) => <StatusBadge status={c.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (c) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(c),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingCategory(c),
                      destructive: true,
                      dividerBefore: true,
                    },
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

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} />

      <ConfirmModal
        opened={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(undefined)}
        title="Delete category?"
        description={`This will permanently delete "${deletingCategory?.name}". Categories linked to products can't be deleted — deactivate them instead.`}
        confirmLabel="Delete Category"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
      />
    </Stack>
  );
}
