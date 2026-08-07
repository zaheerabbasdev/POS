"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchExpenses, deleteExpense, type Expense } from "@/lib/api/expenses";
import { getApiErrorMessage } from "@/lib/api-client";
import { ExpenseFormDialog } from "./expense-form-dialog";

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<Expense | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchExpenses({ limit: 50 }),
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Record and track business expenses by category.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Expense
        </Button>
      </div>

      <Card className="max-w-xs">
        <CardContent className="py-4">
          <span className="text-xs text-muted-foreground">Total (this page)</span>
          <p className="text-lg font-semibold">{totalAmount}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense #</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{expense.expenseNumber}</TableCell>
                    <TableCell className="font-medium">{expense.category}</TableCell>
                    <TableCell className="text-right">{expense.amount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{expense.description ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(expense)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingExpense(expense)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} />

      <ConfirmDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(open) => !open && setDeletingExpense(undefined)}
        title="Delete this expense?"
        description={`This will permanently remove "${deletingExpense?.expenseNumber}" (${deletingExpense?.amount}). This cannot be undone.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingExpense && deleteMutation.mutate(deletingExpense.id)}
      />
    </div>
  );
}
