"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchEmployees } from "@/lib/api/employees";
import { fetchRepair, updateRepair, updateRepairStatus, type RepairStatus } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api-client";
import { REPAIR_STATUS_ITEMS } from "@/lib/select-items";
import { AddPartDialog } from "./add-part-dialog";

const STATUS_VARIANT: Record<RepairStatus, "default" | "secondary" | "destructive" | "outline"> = {
  RECEIVED: "outline",
  UNDER_INSPECTION: "secondary",
  WAITING_FOR_PARTS: "secondary",
  IN_PROGRESS: "secondary",
  READY_FOR_DELIVERY: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

export default function RepairDetailPage(props: PageProps<"/dashboard/repairs/[id]">) {
  const { id } = use(props.params);
  const queryClient = useQueryClient();
  const [addPartOpen, setAddPartOpen] = useState(false);
  // "" rather than undefined — Base UI warns if a Select's value switches
  // between undefined (uncontrolled) and a defined string (controlled)
  // across renders, which selecting a status here would trigger.
  const [pendingStatus, setPendingStatus] = useState("");
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [actualCost, setActualCost] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string | null>(null);

  const { data: repair, isLoading } = useQuery({
    queryKey: ["repairs", id],
    queryFn: () => fetchRepair(id),
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", { forSelect: true }],
    queryFn: () => fetchEmployees({ status: "ACTIVE", limit: 100 }),
  });
  const technicianItems = useMemo(
    () => Object.fromEntries((employees?.data ?? []).map((e) => [e.id, e.name])),
    [employees],
  );

  const statusMutation = useMutation({
    mutationFn: (status: RepairStatus) => updateRepairStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repairs", id] });
      void queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast.success("Repair status updated.");
      setPendingStatus("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const detailsMutation = useMutation({
    mutationFn: () =>
      updateRepair(id, {
        diagnosis: diagnosis ?? undefined,
        technicianId: technicianId || undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
        remarks: remarks ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repairs", id] });
      toast.success("Repair details saved.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !repair) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isClosed = repair.status === "DELIVERED" || repair.status === "CANCELLED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Repair {repair.repairTicketNumber}</h1>
          <p className="text-muted-foreground">
            {repair.customer} · {repair.customerPhone ?? "no phone"} · Received{" "}
            {new Date(repair.receivedDate).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[repair.status]}>{REPAIR_STATUS_ITEMS[repair.status]}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Repair Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Device</span>
                <p>{repair.device ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">IMEI</span>
                <p className="font-mono text-xs">{repair.imei ?? "—"}</p>
              </div>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Problem</span>
              <p className="text-sm">{repair.problemDescription}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="repair-diagnosis" className="text-sm font-medium">
                Diagnosis
              </label>
              <Textarea
                id="repair-diagnosis"
                rows={2}
                value={diagnosis ?? repair.diagnosis ?? ""}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Technician</label>
                <Select
                  items={technicianItems}
                  value={technicianId ?? repair.technician ?? ""}
                  onValueChange={(v) => setTechnicianId(v ?? "")}
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
                <p className="text-xs text-muted-foreground">Re-select to change — shows the current name until then.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="repair-actual-cost" className="text-sm font-medium">
                  Actual Cost (parts + labor)
                </label>
                <Input
                  id="repair-actual-cost"
                  inputMode="decimal"
                  value={actualCost ?? repair.actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="repair-remarks" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="repair-remarks"
                rows={2}
                value={remarks ?? repair.remarks ?? ""}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <Button
              className="self-start"
              disabled={detailsMutation.isPending}
              onClick={() => detailsMutation.mutate()}
            >
              {detailsMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">Estimated Cost</span>
              <span className="text-lg font-semibold">{repair.estimatedCost}</span>
            </div>

            {!isClosed ? (
              <>
                <Select items={REPAIR_STATUS_ITEMS} value={pendingStatus} onValueChange={(v) => setPendingStatus(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Change status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPAIR_STATUS_ITEMS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!pendingStatus || statusMutation.isPending}
                  onClick={() => pendingStatus && statusMutation.mutate(pendingStatus as RepairStatus)}
                >
                  {statusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {repair.status === "DELIVERED" ? "Device delivered — closed." : "Ticket cancelled — closed."}
              </p>
            )}

            {repair.deliveredDate ? (
              <p className="text-xs text-muted-foreground">Delivered {new Date(repair.deliveredDate).toLocaleString()}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Parts Used</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setAddPartOpen(true)}>
            Add Part
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repair.items.length > 0 ? (
                repair.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitPrice}</TableCell>
                    <TableCell className="text-right">{item.totalPrice}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No parts recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddPartDialog open={addPartOpen} onOpenChange={setAddPartOpen} repairId={id} />
    </div>
  );
}
