"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Select,
  Text,
  Box,
  Badge,
} from "@mantine/core";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { fetchProducts, fetchProduct, deleteProduct, type ProductListItem } from "@/lib/api/products";
import { fetchCategories } from "@/lib/api/categories";
import { getApiErrorMessage } from "@/lib/api-client";
import { ProductFormDialog } from "./product-form-dialog";

const PAGE_SIZE = 50;

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = useState<ProductListItem | undefined>(undefined);
  const queryClient = useQueryClient();

  // All TanStack Query hooks unchanged
  const { data, isLoading } = useQuery({
    queryKey: ["products", { search, categoryId, page }],
    queryFn: () =>
      fetchProducts({ search: search || undefined, categoryId: categoryId || undefined, page, limit: PAGE_SIZE }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", { forSelect: true }],
    queryFn: () => fetchCategories({ status: "active", limit: 100 }),
  });

  const categoryItems = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...(categories?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const { data: editingProduct } = useQuery({
    queryKey: ["products", editingProductId],
    queryFn: () => fetchProduct(editingProductId!),
    enabled: Boolean(editingProductId),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product deactivated.");
      setDeletingProduct(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingProductId(undefined);
    setFormOpen(true);
  };
  const openEdit = (product: ProductListItem) => {
    setEditingProductId(product.id);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Products"
        description="Manage mobile phones, accessories, and pricing."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Product
          </Button>
        }
      />

      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Search by name, SKU, or barcode…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          placeholder="All categories"
          data={categoryItems}
          value={categoryId || null}
          onChange={(v) => {
            setCategoryId(v ?? "");
            setPage(1);
          }}
          clearable
          style={{ width: 200 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle={search || categoryId ? "No matching products" : "No products yet"}
          emptyDescription={
            search || categoryId
              ? "No products match your filters. Try adjusting your search or category."
              : "Add your first product to get started."
          }
          columns={[
            {
              key: "sku",
              header: "SKU",
              render: (p) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {p.sku}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (p) => (
                <Text size="sm" fw={500}>
                  {p.name}
                </Text>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (p) => <Text size="sm">{p.category}</Text>,
            },
            {
              key: "brand",
              header: "Brand",
              render: (p) => <Text size="sm" c="dimmed">{p.brand ?? "—"}</Text>,
            },
            {
              key: "price",
              header: "Price",
              align: "right",
              render: (p) => (
                <Text size="sm" fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {p.price}
                </Text>
              ),
            },
            {
              key: "stock",
              header: "Stock",
              align: "right",
              render: (p) =>
                p.stock === 0 ? (
                  <Badge color="red" variant="light" size="sm">Out of stock</Badge>
                ) : (
                  <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.stock}
                  </Text>
                ),
            },
            {
              key: "status",
              header: "Status",
              render: (p) => <StatusBadge status={p.status} />,
            },
            {
              key: "actions",
              header: "",
              render: (p) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(p),
                    },
                    {
                      label: "Deactivate",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingProduct(p),
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

      {/* Dialogs — business logic unchanged */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProductId ? editingProduct : undefined}
      />

      <ConfirmModal
        opened={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(undefined)}
        title="Deactivate product?"
        description={`"${deletingProduct?.name}" will be marked inactive and hidden from sales. Its history is preserved.`}
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
      />
    </Stack>
  );
}
