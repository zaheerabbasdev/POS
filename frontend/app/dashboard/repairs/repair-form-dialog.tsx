"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open ? <RepairFormDialogBody onOpenChange={onOpenChange} /> : null}</DialogContent>
    </Dialog>
  );
}

function RepairFormDialogBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: customers } = useQuery({
    queryKey: ["customers", { forSelect: true }],
    queryFn: () => fetchCustomers({ status: "active", limit: 100 }),
  });
  const customerItems = useMemo(
    () => Object.fromEntries((customers?.data ?? []).map((c) => [c.id, c.name])),
    [customers],
  );

  const { data: employees } = useQuery({
    queryKey: ["employees", { forSelect: true }],
    queryFn: () => fetchEmployees({ status: "ACTIVE", limit: 100 }),
  });
  const technicianItems = useMemo(
    () => Object.fromEntries((employees?.data ?? []).map((e) => [e.id, e.name])),
    [employees],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      // Navigating away unmounts this dialog anyway — skip onOpenChange(false)
      // here. Calling it right before router.push() raced Base UI's
      // dialog-close transition against the navigation-triggered unmount,
      // occasionally leaving an orphaned overlay portal that blocked clicks
      // on the next page.
      router.push(`/dashboard/repairs/${repair.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>New Repair Ticket</DialogTitle>
        <DialogDescription>Log a customer device for repair.</DialogDescription>
      </DialogHeader>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Customer</label>
          <Select items={customerItems} value={watch("customerId")} onValueChange={(v) => setValue("customerId", v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers?.data.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerId ? <p className="text-sm text-destructive">{errors.customerId.message}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="repair-device" className="text-sm font-medium">
              Device
            </label>
            <Input id="repair-device" placeholder="e.g. iPhone 13" {...register("device")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="repair-imei" className="text-sm font-medium">
              IMEI
            </label>
            <Input id="repair-imei" placeholder="Optional" {...register("imei")} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="repair-problem" className="text-sm font-medium">
            Problem
          </label>
          <Textarea id="repair-problem" rows={2} aria-invalid={Boolean(errors.problem)} {...register("problem")} />
          {errors.problem ? <p className="text-sm text-destructive">{errors.problem.message}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Technician</label>
            <Select
              items={technicianItems}
              value={watch("technicianId")}
              onValueChange={(v) => setValue("technicianId", v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {employees?.data.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="repair-estimated-cost" className="text-sm font-medium">
              Estimated Cost
            </label>
            <Input id="repair-estimated-cost" inputMode="decimal" {...register("estimatedCost")} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Repair Ticket"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
