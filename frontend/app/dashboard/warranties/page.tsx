"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paper,
  Stack,
  Group,
  Select,
  Button,
  Text,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchWarranties, type Warranty } from "@/lib/api/warranties";
import { ClaimDialog } from "./claim-dialog";

const STATUS_ITEMS = { all: "All statuses", ACTIVE: "Active", EXPIRED: "Expired", CLAIMED: "Claimed", CANCELLED: "Cancelled" };
const PAGE_SIZE = 50;

export default function WarrantiesPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["warranties", { status, page }],
    queryFn: () =>
      fetchWarranties({
        status: status === "all" ? undefined : (status as Warranty["status"]),
        page,
        limit: PAGE_SIZE,
      }),
  });

  const openClaim = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setClaimOpen(true);
  };

  const statusSelectItems = Object.entries(STATUS_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Stack gap="lg">
      <PageHeader
        title="Warranties"
        description="Track product warranties and process claims."
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
          emptyTitle={status !== "all" ? "No matching warranties" : "No warranties yet"}
          emptyDescription={
            status !== "all"
              ? "No warranties match the selected status."
              : "Warranties will appear here when sold."
          }
          columns={[
            {
              key: "product",
              header: "Product",
              render: (w) => (
                <Text size="sm" fw={500}>
                  {w.product}
                </Text>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              render: (w) => (
                <Text size="sm">
                  {w.customer}
                </Text>
              ),
            },
            {
              key: "invoice",
              header: "Invoice",
              render: (w) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {w.invoiceNumber}
                </Text>
              ),
            },
            {
              key: "period",
              header: "Period",
              render: (w) => (
                <Text size="sm">
                  {w.periodMonths} mo
                </Text>
              ),
            },
            {
              key: "expiry",
              header: "Expiry",
              render: (w) => (
                <Text size="sm">
                  {new Date(w.expiryDate).toLocaleDateString()}
                </Text>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (w) => <StatusBadge status={w.status} type="warranty" />,
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (w) =>
                w.status === "ACTIVE" ? (
                  <Button variant="subtle" size="xs" color="indigo" onClick={() => openClaim(w)}>
                    Claim
                  </Button>
                ) : null,
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

      <ClaimDialog open={claimOpen} onOpenChange={setClaimOpen} warranty={selectedWarranty} />
    </Stack>
  );
}
