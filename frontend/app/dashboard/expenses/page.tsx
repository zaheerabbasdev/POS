"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Banknote } from "lucide-react";
import {
  Paper,
  Stack,
  Button,
  Text,
  Badge,
  Box,
  SimpleGrid,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmModal } from "@/components/confirm-modal";
import { MoneyText } from "@/components/currency-display";
import { StatCard } from "@/components/stat-card";
import { fetchExpenses, deleteExpense, type Expense } from "@/lib/api/expenses";
import { getApiErrorMessage } from "@/lib/api-client";
import { ExpenseFormDialog } from "./expense-form-dialog";

const PAGE_SIZE = 50;

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<Expense | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", { page }],
    queryFn: () => fetchExpenses({ page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted.");
      setDeletingExpense(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingExpense(undefined);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const totalAmount = data?.data.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <Stack gap="lg">
      <PageHeader
        title="Expenses"
        description="Record and track business expenses by category."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Expense
          </Button>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard
          label="Total (this page)"
          value={<MoneyText value={totalAmount} fw={600} size="xl" />}
          tone="default"
          icon={Banknote}
        />
      </SimpleGrid>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle="No expenses recorded yet"
          emptyDescription="Add an expense to start tracking your outflow."
          columns={[
            {
              key: "expenseNumber",
              header: "Expense #",
              render: (e) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {e.expenseNumber}
                </Text>
              ),
            },
            {
              key: "category",
              header: "Category",
              render: (e) => (
                <Text size="sm" fw={500}>
                  {e.category}
                </Text>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (e) => <MoneyText value={e.amount} fw={500} />,
            },
            {
              key: "paymentMethod",
              header: "Method",
              render: (e) => (
                <Badge variant="outline" color="gray" size="sm">
                  {e.paymentMethod}
                </Badge>
              ),
            },
            {
              key: "date",
              header: "Date",
              render: (e) => (
                <Text size="sm">
                  {new Date(e.expenseDate).toLocaleDateString()}
                </Text>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (e) => (
                <Text size="sm" c="dimmed" truncate style={{ maxWidth: 200 }}>
                  {e.description ?? "—"}
                </Text>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (e) => (
                <ActionMenu
                  items={[
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(e),
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={14} />,
                      onClick: () => setDeletingExpense(e),
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

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />

      <ConfirmModal
        opened={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(undefined)}
        title="Delete this expense?"
        description={`This will permanently remove "${deletingExpense?.expenseNumber}" (${deletingExpense?.amount}). This cannot be undone.`}
        confirmLabel="Delete Expense"
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
      />
    </Stack>
  );
}
