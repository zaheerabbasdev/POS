"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchRepairs, type RepairStatus } from "@/lib/api/repairs";
import { REPAIR_STATUS_ITEMS } from "@/lib/select-items";
import { RepairFormDialog } from "./repair-form-dialog";

const STATUS_VARIANT: Record<RepairStatus, "default" | "secondary" | "destructive" | "outline"> = {
  RECEIVED: "outline",
  UNDER_INSPECTION: "secondary",
  WAITING_FOR_PARTS: "secondary",
  IN_PROGRESS: "secondary",
  READY_FOR_DELIVERY: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

const STATUS_FILTER_ITEMS = { all: "All statuses", ...REPAIR_STATUS_ITEMS };

export default function RepairsPage() {
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["repairs", { status }],
    queryFn: () => fetchRepairs({ status: status === "all" ? undefined : (status as RepairStatus), limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Repairs</h1>
          <p className="text-muted-foreground">Track customer repair tickets from intake to delivery.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> New Repair Ticket
        </Button>
      </div>

      <div className="max-w-xs">
        <Select items={STATUS_FILTER_ITEMS} value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_FILTER_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((repair) => (
                  <TableRow key={repair.id}>
                    <TableCell>
                      <Link href={`/dashboard/repairs/${repair.id}`} className="font-mono text-xs hover:underline">
                        {repair.repairTicketNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{repair.customer}</TableCell>
                    <TableCell>{repair.device ?? "—"}</TableCell>
                    <TableCell>{repair.technician ?? "Unassigned"}</TableCell>
                    <TableCell className="text-right">{repair.estimatedCost}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[repair.status]}>{REPAIR_STATUS_ITEMS[repair.status]}</Badge>
                    </TableCell>
                    <TableCell>{new Date(repair.receivedDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No repair tickets found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RepairFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
