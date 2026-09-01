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
import { fetchProductModels, deleteProductModel, type ProductModel } from "@/lib/api/product-models";
import { getApiErrorMessage } from "@/lib/api-client";
import { ModelFormDialog } from "./model-form-dialog";

const PAGE_SIZE = 50;

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ProductModel | undefined>(undefined);
  const [deletingModel, setDeletingModel] = useState<ProductModel | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["product-models", { search, page }],
    queryFn: () => fetchProductModels({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductModel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-models"] });
      toast.success("Model deleted.");
      setDeletingModel(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingModel(undefined);
    setFormOpen(true);
  };

  const openEdit = (model: ProductModel) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Product Models"
        description="Manage phone models and variants."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Model
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search models…"
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
          emptyTitle={search ? "No matching models" : "No models yet"}
          emptyDescription={
            search
              ? "No models match your search."
              : "Add your first product model."
          }
          columns={[
            {
              key: "name",
              header: "Name",
              render: (m) => (
                <Text size="sm" fw={500}>
                  {m.name}
                </Text>
              ),
            },
            {
              key: "brand",
              header: "Brand",
              render: (m) => (
                <Text size="sm">
                  {m.brand}
                </Text>
              ),
            },
            {
              key: "releaseYear",
              header: "Release Year",
              render: (m) => (
                <Text size="sm" c="dimmed">
                  {m.releaseYear ?? "—"}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (m) => <StatusBadge status={m.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (m) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(m),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingModel(m),
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

      <ModelFormDialog open={formOpen} onOpenChange={setFormOpen} model={editingModel} />

      <ConfirmModal
        opened={Boolean(deletingModel)}
        onClose={() => setDeletingModel(undefined)}
        title="Delete model?"
        description={`This will permanently delete "${deletingModel?.name}". Models linked to products can't be deleted — deactivate them instead.`}
        confirmLabel="Delete Model"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingModel && deleteMutation.mutate(deletingModel.id)}
      />
    </Stack>
  );
}
