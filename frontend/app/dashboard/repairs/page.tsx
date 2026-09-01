"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  Select,
  Button,
  Text,
  Anchor,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { MoneyText } from "@/components/currency-display";
import { fetchRepairs, type RepairStatus } from "@/lib/api/repairs";
import { REPAIR_STATUS_ITEMS } from "@/lib/select-items";
import { RepairFormDialog } from "./repair-form-dialog";

const PAGE_SIZE = 50;

export default function RepairsPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["repairs", { status, page }],
    queryFn: () =>
      fetchRepairs({
        status: status === "all" ? undefined : (status as RepairStatus),
        page,
        limit: PAGE_SIZE,
      }),
  });

  const statusSelectItems = [
    { value: "all", label: "All statuses" },
    ...Object.entries(REPAIR_STATUS_ITEMS).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <Stack gap="lg">
      <PageHeader
        title="Repairs"
        description="Track customer repair tickets from intake to delivery."
        actions={
          <Button onClick={() => setFormOpen(true)} leftSection={<Plus size={16} />} color="indigo">
            New Repair Ticket
          </Button>
        }
      />

      <Group gap="sm">
        <Select
          placeholder="All statuses"
          data={statusSelectItems}
          value={status}
          onChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
          style={{ width: 220 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle={status !== "all" ? "No matching repair tickets" : "No repair tickets yet"}
          emptyDescription={
            status !== "all"
              ? "No repair tickets match the selected status."
              : "Create your first repair ticket."
          }
          columns={[
            {
              key: "ticket",
              header: "Ticket",
              render: (r) => (
                <Anchor
                  component={Link}
                  href={`/dashboard/repairs/${r.id}`}
                  size="sm"
                  style={{ fontFamily: "var(--mantine-font-family-monospace)", fontWeight: 500 }}
                >
                  {r.repairTicketNumber}
                </Anchor>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (r) => (
                <Text size="sm" fw={500}>
                  {r.customer}
                </Text>
              ),
            },
            {
              key: "device",
              header: "Device",
              render: (r) => (
                <Text size="sm">
                  {r.device ?? "—"}
                </Text>
              ),
            },
            {
              key: "technician",
              header: "Technician",
              render: (r) => (
                <Text size="sm" c="dimmed">
                  {r.technician ?? "Unassigned"}
                </Text>
              ),
            },
            {
              key: "estCost",
              header: "Est. Cost",
              align: "right",
              render: (r) => <MoneyText value={r.estimatedCost} />,
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} type="repair" />,
            },
            {
              key: "received",
              header: "Received",
              render: (r) => (
                <Text size="sm">
                  {new Date(r.receivedDate).toLocaleDateString()}
                </Text>
              ),
            },
          ]}
        />

        {data && (
          <Box style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
            <PaginationControls
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </Box>
        )}
      </Paper>

      <RepairFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </Stack>
  );
}
