"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchExpenseCategories, createExpense, updateExpense, type Expense } from "@/lib/api/expenses";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";

const expenseFormSchema = z.object({
  category: z.string().trim().min(1, "Category is required."),
  amount: z.string().trim().min(1, "Amount is required."),
  paymentMethod: z.string(),
  description: z.string().trim().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense;
}

export function ExpenseFormDialog({ open, onOpenChange, expense }: ExpenseFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open ? <ExpenseFormDialogBody key={expense?.id ?? "new"} expense={expense} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseFormDialogBody({
  expense,
  onOpenChange,
}: {
  expense?: Expense;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = Boolean(expense);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({ queryKey: ["expense-categories"], queryFn: fetchExpenseCategories });
  const categoryItems = Object.fromEntries((categories ?? []).map((c) => [c.name, c.name]));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: expense?.category ?? "",
      amount: expense?.amount ?? "",
      paymentMethod: expense?.paymentMethod?.toLowerCase() ?? "cash",
      description: expense?.description ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ExpenseFormValues) => {
      const amount = Number(values.amount);
      return isEditing
        ? updateExpense(expense!.id, { amount, paymentMethod: values.paymentMethod, description: values.description })
        : createExpense({ category: values.category, amount, paymentMethod: values.paymentMethod, description: values.description });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast.success(isEditing ? "Expense updated." : "Expense recorded.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Expense" : "Add Expense"}</DialogTitle>
        <DialogDescription>{isEditing ? "Update this expense record." : "Record a new business expense."}</DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        {!isEditing ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Category</label>
            <Select
              items={categoryItems}
              value={watch("category")}
              onValueChange={(v) => setValue("category", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category ? <p className="text-sm text-destructive">{errors.category.message}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Category</span>
            <Input value={expense!.category} disabled />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="expense-amount" className="text-sm font-medium">
              Amount
            </label>
            <Input id="expense-amount" inputMode="decimal" aria-invalid={Boolean(errors.amount)} {...register("amount")} />
            {errors.amount ? <p className="text-sm text-destructive">{errors.amount.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Payment Method</label>
            <Select
              items={PAYMENT_METHOD_ITEMS}
              value={watch("paymentMethod")}
              onValueChange={(v) => setValue("paymentMethod", v ?? "cash")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-description" className="text-sm font-medium">
            Description
          </label>
          <Input id="expense-description" {...register("description")} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Record Expense"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
