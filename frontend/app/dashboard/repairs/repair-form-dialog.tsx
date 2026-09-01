"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  Group,
  TextInput,
  Textarea,
  Button,
  Select,
  SimpleGrid,
} from "@mantine/core";
import { fetchCustomers } from "@/lib/api/customers";
import { fetchEmployees } from "@/lib/api/employees";
import { createRepair } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api-client";

const repairFormSchema = z.object({
  customerId: z.string().uuid("Select a customer."),
  device: z.string().trim().optional(),
  imei: z.string().trim().optional(),
  problem: z.string().trim().min(1, "Describe the problem."),
  technicianId: z.string().optional(),
  estimatedCost: z.string().trim().optional(),
});

type RepairFormValues = z.infer<typeof repairFormSchema>;

interface RepairFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairFormDialog({ open, onOpenChange }: RepairFormDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title="New Repair Ticket"
      size="md"
    >
      {open && <RepairFormDialogBody onOpenChange={onOpenChange} />}
    </Modal>
  );
}

function RepairFormDialogBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: customers } = useQuery({
    queryKey: ["customers", { forSelect: true }],
    queryFn: () => fetchCustomers({ status: "active", limit: 100 }),
  });
  
  const customerOptions = useMemo(() => {
    return (customers?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  }, [customers]);

  const { data: employees } = useQuery({
    queryKey: ["employees", { forSelect: true }],
    queryFn: () => fetchEmployees({ status: "ACTIVE", limit: 100 }),
  });
  
  const technicianOptions = useMemo(() => {
    return (employees?.data ?? []).map((e) => ({ value: e.id, label: e.name }));
  }, [employees]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RepairFormValues>({
    resolver: zodResolver(repairFormSchema),
    defaultValues: { customerId: "", device: "", imei: "", problem: "", technicianId: "", estimatedCost: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: RepairFormValues) =>
      createRepair({
        customerId: values.customerId,
        device: values.device || undefined,
        imei: values.imei || undefined,
        problem: values.problem,
        technicianId: values.technicianId || undefined,
        ...(values.estimatedCost ? { estimatedCost: Number(values.estimatedCost) } : {}),
      }),
    onSuccess: (repair) => {
      void queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast.success(`Repair ticket ${repair.repairTicketNumber} created.`);
      router.push(`/dashboard/repairs/${repair.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Stack gap="md">
        <Controller
          name="customerId"
          control={control}
          render={({ field }) => (
            <Select
              label="Customer"
              placeholder="Select customer"
              data={customerOptions}
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              error={errors.customerId?.message}
              withAsterisk
            />
          )}
        />

        <SimpleGrid cols={2}>
          <TextInput
            label="Device"
            placeholder="e.g. iPhone 13"
            {...register("device")}
          />
          <TextInput
            label="IMEI"
            placeholder="Optional"
            {...register("imei")}
          />
        </SimpleGrid>

        <Textarea
          label="Problem"
          minRows={2}
          withAsterisk
          {...register("problem")}
          error={errors.problem?.message}
        />

        <SimpleGrid cols={2}>
          <Controller
            name="technicianId"
            control={control}
            render={({ field }) => (
              <Select
                label="Technician"
                placeholder="Unassigned"
                data={technicianOptions}
                value={field.value}
                onChange={(v) => field.onChange(v ?? "")}
              />
            )}
          />
          <TextInput
            label="Estimated Cost"
            inputMode="decimal"
            {...register("estimatedCost")}
          />
        </SimpleGrid>

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
            Create Repair Ticket
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
