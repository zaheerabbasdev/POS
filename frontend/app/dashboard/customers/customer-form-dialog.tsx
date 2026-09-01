"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { ImageUploadField } from "@/components/image-upload-field";
import { createCustomer, fetchCustomer, updateCustomer, type Customer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api-client";

const CUSTOMER_TYPE_ITEMS = [
  { value: "REGULAR", label: "Regular" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "VIP", label: "VIP" },
  { value: "CORPORATE", label: "Corporate" },
];

const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  customerType: z.enum(["REGULAR", "WHOLESALE", "VIP", "CORPORATE"]),
  creditLimit: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const isEditing = Boolean(customer);
  const queryClient = useQueryClient();

  const { data: liveCustomer } = useQuery({
    queryKey: ["customers", customer?.id],
    queryFn: () => fetchCustomer(customer!.id),
    enabled: isEditing,
    initialData: customer,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", phone: "", email: "", address: "", city: "", customerType: "REGULAR", creditLimit: "", notes: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        email: customer?.email ?? "",
        address: customer?.address ?? "",
        city: customer?.city ?? "",
        customerType: customer?.customerType ?? "REGULAR",
        creditLimit: customer?.creditLimit ?? "",
        notes: customer?.notes ?? "",
        status: customer?.status ?? "active",
      });
    }
  }, [open, customer, reset]);

  const mutation = useMutation({
    mutationFn: (values: CustomerFormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address,
        city: values.city,
        customerType: values.customerType,
        notes: values.notes,
        status: values.status,
        ...(values.creditLimit ? { creditLimit: Number(values.creditLimit) } : {}),
      };
      return isEditing ? updateCustomer(customer!.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(isEditing ? "Customer updated." : "Customer created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>{isEditing ? "Edit Customer" : "Add Customer"}</Text>}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isEditing ? "Update this customer's details." : "Register a new customer."}
        </Text>

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <Stack gap="md">
            {isEditing ? (
              <ImageUploadField
                type="customer"
                entityId={customer!.id}
                imageUrl={liveCustomer?.attachmentUrl ?? null}
                label="Attachment"
                invalidateQueryKeys={[["customers"], ["customers", customer!.id]]}
              />
            ) : null}

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

            <TextInput
              label="Email"
              type="email"
              {...register("email")}
              error={errors.email?.message}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Address"
                {...register("address")}
              />
              <TextInput
                label="City"
                {...register("city")}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Customer type"
                data={CUSTOMER_TYPE_ITEMS}
                value={watch("customerType")}
                onChange={(v) => setValue("customerType", v as CustomerFormValues["customerType"])}
              />
              <TextInput
                label="Credit limit"
                inputMode="decimal"
                {...register("creditLimit")}
              />
            </SimpleGrid>

            <Textarea
              label="Notes"
              rows={2}
              {...register("notes")}
            />

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
                {isEditing ? "Save changes" : "Create customer"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
