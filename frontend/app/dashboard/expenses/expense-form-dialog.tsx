"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Button,
  Select,
  SimpleGrid,
} from "@mantine/core";
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
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={expense ? "Edit Expense" : "Add Expense"}
      size="md"
    >
      {open && <ExpenseFormDialogBody key={expense?.id ?? "new"} expense={expense} onOpenChange={onOpenChange} />}
    </Modal>
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
  
  const categoryOptions = (categories ?? []).map((c) => ({
    value: c.name,
    label: c.name,
  }));

  const paymentMethodOptions = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  const {
    register,
    handleSubmit,
    control,
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
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Stack gap="md">
        {!isEditing ? (
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select
                label="Category"
                placeholder="Select category"
                data={categoryOptions}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
                error={errors.category?.message}
                withAsterisk
              />
            )}
          />
        ) : (
          <TextInput
            label="Category"
            value={expense!.category}
            disabled
          />
        )}

        <SimpleGrid cols={2}>
          <TextInput
            label="Amount"
            inputMode="decimal"
            withAsterisk
            {...register("amount")}
            error={errors.amount?.message}
          />
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <Select
                label="Payment Method"
                data={paymentMethodOptions}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "cash")}
              />
            )}
          />
        </SimpleGrid>

        <TextInput
          label="Description"
          {...register("description")}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
            {isEditing ? "Save changes" : "Record Expense"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
