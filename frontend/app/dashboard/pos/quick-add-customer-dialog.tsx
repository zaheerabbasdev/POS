"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { createCustomer, type Customer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api-client";

const quickAddCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
});

type QuickAddCustomerValues = z.infer<typeof quickAddCustomerSchema>;

interface QuickAddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: Customer) => void;
}

export function QuickAddCustomerDialog({ open, onOpenChange, onCreated }: QuickAddCustomerDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddCustomerValues>({
    resolver: zodResolver(quickAddCustomerSchema),
    defaultValues: { name: "", phone: "" },
  });

  useEffect(() => {
    if (open) reset({ name: "", phone: "" });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: QuickAddCustomerValues) => createCustomer(values),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`"${customer.name}" added.`);
      onCreated(customer);
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>New Customer</Text>}
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Quick add for checkout — fill in the rest (email, address, credit limit) later from the Customers page.
        </Text>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <Stack gap="md">
            <TextInput
              label="Name"
              autoFocus
              {...register("name")}
              error={errors.name?.message}
            />
            <TextInput
              label="Phone"
              {...register("phone")}
              error={errors.phone?.message}
            />

            <Group justify="flex-end" mt="sm">
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                Add Customer
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
