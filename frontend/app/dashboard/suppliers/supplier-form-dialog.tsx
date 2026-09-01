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
  SimpleGrid,
  TextInput,
  Select,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { createSupplier, updateSupplier, type Supplier } from "@/lib/api/suppliers";
import { getApiErrorMessage } from "@/lib/api-client";

const supplierFormSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  contactPerson: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  taxNumber: z.string().trim().optional(),
  paymentTerms: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

export function SupplierFormDialog({ open, onOpenChange, supplier }: SupplierFormDialogProps) {
  const isEditing = Boolean(supplier);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: "", phone: "", contactPerson: "", email: "", address: "", taxNumber: "", paymentTerms: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: supplier?.name ?? "",
        phone: supplier?.phone ?? "",
        contactPerson: supplier?.contactPerson ?? "",
        email: supplier?.email ?? "",
        address: supplier?.address ?? "",
        taxNumber: supplier?.taxNumber ?? "",
        paymentTerms: supplier?.paymentTerms ?? "",
        status: supplier?.status ?? "active",
      });
    }
  }, [open, supplier, reset]);

  const mutation = useMutation({
    mutationFn: (values: SupplierFormValues) => {
      const payload = { ...values, email: values.email || undefined };
      return isEditing ? updateSupplier(supplier!.id, payload) : createSupplier(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(isEditing ? "Supplier updated." : "Supplier created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>{isEditing ? "Edit Supplier" : "Add Supplier"}</Text>}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isEditing ? "Update this supplier's details." : "Register a new supplier."}
        </Text>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Name"
                {...register("name")}
                error={errors.name?.message}
              />
              <TextInput
                label="Phone"
                {...register("phone")}
                error={errors.phone?.message}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Contact person"
                {...register("contactPerson")}
              />
              <TextInput
                label="Email"
                type="email"
                {...register("email")}
                error={errors.email?.message}
              />
            </SimpleGrid>

            <TextInput
              label="Address"
              {...register("address")}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Tax number"
                {...register("taxNumber")}
              />
              <TextInput
                label="Payment terms"
                placeholder="e.g. Net 30"
                {...register("paymentTerms")}
              />
            </SimpleGrid>

            {isEditing ? (
              <Select
                label="Status"
                data={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                value={watch("status")}
                onChange={(v) => setValue("status", v as "active" | "inactive")}
              />
            ) : null}

            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                {isEditing ? "Save changes" : "Create supplier"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
