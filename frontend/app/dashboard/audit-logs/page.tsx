"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Text,
  Badge,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchAuditLogs } from "@/lib/api/audit-logs";

const PAGE_SIZE = 50;

/** Read-only trail (DDD Chapter 31) — gated by AUDIT_VIEW, see layout.tsx. */
export default function AuditLogsPage() {
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", { module, action, startDate, endDate, page }],
    queryFn: () =>
      fetchAuditLogs({
        module: module || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  return (
    <Stack gap="lg">
      <PageHeader
        title="Audit Log"
        description="A trail of sensitive actions — who did what, and when."
      />

      <Group gap="sm" align="flex-end">
        <TextInput
          label="Module"
          placeholder="e.g. User, Sale, Role…"
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            setPage(1);
          }}
          style={{ width: 180 }}
        />
        <TextInput
          label="Action"
          placeholder="e.g. CREATE, DELETE…"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          style={{ width: 180 }}
        />
        <TextInput
          type="date"
          label="From"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
        />
        <TextInput
          type="date"
          label="To"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle="No audit entries found"
          emptyDescription="No events match your current filters."
          columns={[
            {
              key: "when",
              header: "When",
              render: (log) => (
                <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </Text>
              ),
            },
            {
              key: "user",
              header: "User",
              render: (log) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {log.username ?? "system"}
                </Text>
              ),
            },
            {
              key: "module",
              header: "Module",
              render: (log) => (
                <Badge variant="outline" color="gray" size="sm">
                  {log.module}
                </Badge>
              ),
            },
            {
              key: "action",
              header: "Action",
              render: (log) => (
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {log.action}
                </Text>
              ),
            },
            {
              key: "description",
              header: "Description",
              render: (log) => (
                <Text size="sm" truncate style={{ maxWidth: 300 }}>
                  {log.description ?? "—"}
                </Text>
              ),
            },
            {
              key: "ip",
              header: "IP",
              render: (log) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {log.ipAddress ?? "—"}
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
    </Stack>
  );
}
