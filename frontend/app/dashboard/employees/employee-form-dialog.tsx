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
import { ImageUploadField } from "@/components/image-upload-field";
import { createEmployee, fetchEmployee, updateEmployee, type Employee } from "@/lib/api/employees";
import { getApiErrorMessage } from "@/lib/api-client";

const EMPLOYEE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const employeeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Phone is required."),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  salary: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={employee ? "Edit Employee" : "Add Employee"}
      size="md"
    >
      {open && (
        <EmployeeFormDialogBody key={employee?.id ?? "new"} employee={employee} onOpenChange={onOpenChange} />
      )}
    </Modal>
  );
}

function EmployeeFormDialogBody({
  employee,
  onOpenChange,
}: {
  employee?: Employee;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = Boolean(employee);
  const queryClient = useQueryClient();

  const { data: liveEmployee } = useQuery({
    queryKey: ["employees", employee?.id],
    queryFn: () => fetchEmployee(employee!.id),
    enabled: isEditing,
    initialData: employee,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: employee?.name ?? "",
      phone: employee?.phone ?? "",
      email: employee?.email ?? "",
      address: employee?.address ?? "",
      designation: employee?.designation ?? "",
      salary: employee?.salary ?? "",
      status: employee?.status ?? "ACTIVE",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address || undefined,
        designation: values.designation || undefined,
        status: values.status,
        ...(values.salary ? { salary: Number(values.salary) } : {}),
      };
      return isEditing ? updateEmployee(employee!.id, payload) : createEmployee(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(isEditing ? "Employee updated." : "Employee created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <Stack gap="md">
        {isEditing && (
          <ImageUploadField
            type="employee"
            entityId={employee!.id}
            imageUrl={liveEmployee?.profileImage ?? null}
            label="Photo"
            invalidateQueryKeys={[["employees"], ["employees", employee!.id]]}
          />
        )}

        <SimpleGrid cols={2}>
          <TextInput
            label="Name"
            withAsterisk
            {...register("name")}
            error={errors.name?.message}
          />
          <TextInput
            label="Phone"
            withAsterisk
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

        <SimpleGrid cols={2}>
          <TextInput
            label="Designation"
            placeholder="e.g. Technician"
            {...register("designation")}
          />
          <TextInput
            label="Salary"
            inputMode="decimal"
            {...register("salary")}
          />
        </SimpleGrid>

        <TextInput
          label="Address"
          {...register("address")}
        />

        {isEditing && (
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                label="Status"
                data={EMPLOYEE_STATUS_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending} color="indigo">
            {isEditing ? "Save changes" : "Create employee"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
