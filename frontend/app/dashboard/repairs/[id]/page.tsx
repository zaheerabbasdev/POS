"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Printer, Plus } from "lucide-react";
import {
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Select,
  TextInput,
  Textarea,
  Paper,
  Skeleton,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/currency-display";
import { ImageUploadField } from "@/components/image-upload-field";
import { fetchEmployees } from "@/lib/api/employees";
import { fetchRepair, updateRepair, updateRepairStatus, type RepairStatus } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api-client";
import { REPAIR_STATUS_ITEMS } from "@/lib/select-items";
import { AddPartDialog } from "./add-part-dialog";

const STATUS_COLORS: Record<RepairStatus, string> = {
  RECEIVED: "gray",
  UNDER_INSPECTION: "orange",
  WAITING_FOR_PARTS: "yellow",
  IN_PROGRESS: "blue",
  READY_FOR_DELIVERY: "teal",
  DELIVERED: "green",
  CANCELLED: "red",
};

export default function RepairDetailPage(props: PageProps<"/dashboard/repairs/[id]">) {
  const { id } = use(props.params);
  const queryClient = useQueryClient();
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
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

  const technicianOptions = useMemo(
    () => (employees?.data ?? []).map((e) => ({ value: e.id, label: e.name })),
    [employees],
  );

  const statusOptions = Object.entries(REPAIR_STATUS_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  const statusMutation = useMutation({
    mutationFn: (status: RepairStatus) => updateRepairStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repairs", id] });
      void queryClient.invalidateQueries({ queryKey: ["repairs"] });
      toast.success("Repair status updated.");
      setPendingStatus(null);
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
    return <Skeleton height={256} width="100%" radius="md" />;
  }

  const isClosed = repair.status === "DELIVERED" || repair.status === "CANCELLED";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title={`Repair ${repair.repairTicketNumber}`}
          description={`${repair.customer} · ${repair.customerPhone ?? "no phone"} · Received ${new Date(
            repair.receivedDate,
          ).toLocaleDateString()}`}
        />
        <Group>
          <Badge color={STATUS_COLORS[repair.status]} variant="light" size="lg">
            {REPAIR_STATUS_ITEMS[repair.status]}
          </Badge>
          <Button
            component={Link}
            href={`/print/repairs/${repair.id}`}
            target="_blank"
            variant="outline"
            leftSection={<Printer size={16} />}
          >
            Print Receipt
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder style={{ gridColumn: "1 / span 2" }}>
          <Text fw={600} size="lg" mb="md">Repair Details</Text>
          <Stack gap="md">
            <Group grow align="flex-start">
              <Box>
                <Text size="sm" c="dimmed">Device</Text>
                <Text size="sm" fw={500}>{repair.device ?? "—"}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">IMEI</Text>
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {repair.imei ?? "—"}
                </Text>
              </Box>
            </Group>

            <Box>
              <Text size="sm" c="dimmed" mb={4}>Problem</Text>
              <Text size="sm">{repair.problemDescription}</Text>
            </Box>

            <ImageUploadField
              type="repair"
              entityId={id}
              imageUrl={repair.imageUrl}
              label="Device Photo"
              invalidateQueryKeys={[["repairs", id]]}
            />

            <Textarea
              label="Diagnosis"
              minRows={2}
              value={diagnosis ?? repair.diagnosis ?? ""}
              onChange={(e) => setDiagnosis(e.currentTarget.value)}
            />

            <Group grow align="flex-start">
              <Select
                label="Technician"
                placeholder="Unassigned"
                data={technicianOptions}
                value={technicianId ?? repair.technician ?? null}
                onChange={(v) => setTechnicianId(v)}
                description="Re-select to change — shows the current name until then."
              />
              <TextInput
                label="Actual Cost (parts + labor)"
                inputMode="decimal"
                value={actualCost ?? repair.actualCost ?? ""}
                onChange={(e) => setActualCost(e.currentTarget.value)}
              />
            </Group>

            <Textarea
              label="Notes"
              minRows={2}
              value={remarks ?? repair.remarks ?? ""}
              onChange={(e) => setRemarks(e.currentTarget.value)}
            />

            <Button
              disabled={detailsMutation.isPending}
              loading={detailsMutation.isPending}
              onClick={() => detailsMutation.mutate()}
              color="indigo"
            >
              Save Details
            </Button>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Status</Text>
          <Stack gap="sm">
            <Box>
              <Text size="sm" c="dimmed">Estimated Cost</Text>
              <Text size="lg" fw={600}><MoneyText value={repair.estimatedCost} /></Text>
            </Box>

            {!isClosed ? (
              <Stack gap="xs" mt="sm">
                <Select
                  placeholder="Change status..."
                  data={statusOptions}
                  value={pendingStatus}
                  onChange={(v) => setPendingStatus(v)}
                />
                <Button
                  disabled={!pendingStatus || statusMutation.isPending}
                  loading={statusMutation.isPending}
                  onClick={() => pendingStatus && statusMutation.mutate(pendingStatus as RepairStatus)}
                >
                  Update Status
                </Button>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed" mt="sm">
                {repair.status === "DELIVERED" ? "Device delivered — closed." : "Ticket cancelled — closed."}
              </Text>
            )}

            {repair.deliveredDate && (
              <Text size="xs" c="dimmed" mt="xs">
                Delivered {new Date(repair.deliveredDate).toLocaleString()}
              </Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600} size="lg">Parts Used</Text>
          <Button variant="outline" size="xs" onClick={() => setAddPartOpen(true)} leftSection={<Plus size={14} />}>
            Add Part
          </Button>
        </Group>
        <DataTable
          data={repair.items}
          keyExtractor={(row) => row.id}
          emptyTitle="No parts recorded yet"
          emptyDescription="Parts assigned to this repair will appear here."
          columns={[
            {
              key: "sku",
              header: "SKU",
              render: (item) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {item.sku}
                </Text>
              ),
            },
            {
              key: "product",
              header: "Part",
              render: (item) => <Text size="sm" fw={500}>{item.name}</Text>,
            },
            {
              key: "qty",
              header: "Qty",
              align: "right",
              render: (item) => <Text size="sm">{item.quantity}</Text>,
            },
            {
              key: "price",
              header: "Unit Price",
              align: "right",
              render: (item) => <MoneyText value={item.unitPrice} />,
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              render: (item) => <MoneyText value={item.totalPrice} />,
            },
          ]}
        />
      </Paper>

      <AddPartDialog open={addPartOpen} onOpenChange={setAddPartOpen} repairId={id} />
    </Stack>
  );
}
