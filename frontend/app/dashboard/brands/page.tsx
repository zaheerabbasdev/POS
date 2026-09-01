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
import { fetchBrands, deleteBrand, type Brand } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { BrandFormDialog } from "./brand-form-dialog";

const PAGE_SIZE = 50;

export default function BrandsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>(undefined);
  const [deletingBrand, setDeletingBrand] = useState<Brand | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["brands", { search, page }],
    queryFn: () => fetchBrands({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted.");
      setDeletingBrand(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingBrand(undefined);
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Brands"
        description="Manage mobile phone and accessory brands."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Brand
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search brands…"
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
          emptyTitle={search ? "No matching brands" : "No brands yet"}
          emptyDescription={
            search
              ? "No brands match your search."
              : "Add your first brand."
          }
          columns={[
            {
              key: "name",
              header: "Name",
              render: (b) => (
                <Text size="sm" fw={500}>
                  {b.name}
                </Text>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (b) => (
                <Text size="sm" c="dimmed">
                  {b.description ?? "—"}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (b) => <StatusBadge status={b.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (b) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(b),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingBrand(b),
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

      <BrandFormDialog open={formOpen} onOpenChange={setFormOpen} brand={editingBrand} />

      <ConfirmModal
        opened={Boolean(deletingBrand)}
        onClose={() => setDeletingBrand(undefined)}
        title="Delete brand?"
        description={`This will permanently delete "${deletingBrand?.name}". Brands linked to products can't be deleted — deactivate them instead.`}
        confirmLabel="Delete Brand"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingBrand && deleteMutation.mutate(deletingBrand.id)}
      />
    </Stack>
  );
}
