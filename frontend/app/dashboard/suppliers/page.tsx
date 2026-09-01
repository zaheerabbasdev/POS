"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Pencil } from "lucide-react";
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
import { MoneyText } from "@/components/currency-display";
import { fetchSuppliers, type Supplier } from "@/lib/api/suppliers";
import { SupplierFormDialog } from "./supplier-form-dialog";

const PAGE_SIZE = 50;

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", { search, page }],
    queryFn: () => fetchSuppliers({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const openCreate = () => {
    setEditingSupplier(undefined);
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers and outstanding payables."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Supplier
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search by name, phone, or code…"
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
          emptyTitle={search ? "No matching suppliers" : "No suppliers yet"}
          emptyDescription={
            search
              ? "No suppliers match your search."
              : "Add your first supplier to start tracking purchases."
          }
          columns={[
            {
              key: "code",
              header: "Code",
              render: (s) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {s.supplierCode}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (s) => (
                <Text size="sm" fw={500}>
                  {s.name}
                </Text>
              ),
            },
            {
              key: "phone",
              header: "Phone",
              render: (s) => (
                <Text size="sm" c="dimmed">
                  {s.phone ?? "—"}
                </Text>
              ),
            },
            {
              key: "contact",
              header: "Contact",
              render: (s) => (
                <Text size="sm" c="dimmed">
                  {s.contactPerson ?? "—"}
                </Text>
              ),
            },
            {
              key: "outstanding",
              header: "Outstanding",
              align: "right",
              render: (s) => (
                <MoneyText
                  value={s.outstandingBalance}
                  c={Number(s.outstandingBalance) > 0 ? "red" : undefined}
                  fw={Number(s.outstandingBalance) > 0 ? 500 : undefined}
                />
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (s) => <StatusBadge status={s.status} type="generic" />,
            },
            {
              key: "actions",
              header: "",
              render: (s) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(s),
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

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editingSupplier} />
    </Stack>
  );
}
