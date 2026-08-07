"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { createEmployee, updateEmployee, type Employee } from "@/lib/api/employees";
import { getApiErrorMessage } from "@/lib/api-client";

const EMPLOYEE_STATUS_ITEMS = { ACTIVE: "Active", INACTIVE: "Inactive" };

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Mounted only while open, keyed on the employee identity — form
            state initializes fresh via defaultValues instead of a
            reset()-in-effect that could re-fire mid-fill. */}
        {open ? (
          <EmployeeFormDialogBody key={employee?.id ?? "new"} employee={employee} onOpenChange={onOpenChange} />
        ) : null}
      </DialogContent>
    </Dialog>
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Employee" : "Add Employee"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Update this employee's details." : "Add a new shop employee."}
        </DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employee-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="employee-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employee-phone" className="text-sm font-medium">
              Phone
            </label>
            <Input id="employee-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
            {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="employee-email" className="text-sm font-medium">
            Email
          </label>
          <Input id="employee-email" type="email" {...register("email")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employee-designation" className="text-sm font-medium">
              Designation
            </label>
            <Input id="employee-designation" placeholder="e.g. Technician" {...register("designation")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="employee-salary" className="text-sm font-medium">
              Salary
            </label>
            <Input id="employee-salary" inputMode="decimal" {...register("salary")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="employee-address" className="text-sm font-medium">
            Address
          </label>
          <Input id="employee-address" {...register("address")} />
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={EMPLOYEE_STATUS_ITEMS}
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as "ACTIVE" | "INACTIVE")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create employee"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
