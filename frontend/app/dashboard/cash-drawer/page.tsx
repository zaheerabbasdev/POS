"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, RefreshCcw, ShoppingCart, Wallet } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Badge,
  Box,
  SimpleGrid,
  Skeleton,
  Card,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatCard } from "@/components/stat-card";
import { MoneyText } from "@/components/currency-display";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchCurrentDrawer, fetchDrawerSummary, fetchDrawerHistory, openDrawer, closeDrawer, cashIn, cashOut } from "@/lib/api/cash-drawer";
import { getApiErrorMessage } from "@/lib/api-client";

const HISTORY_PAGE_SIZE = 20;

export default function CashDrawerPage() {
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementRemarks, setMovementRemarks] = useState("");

  const { data: drawer, isLoading: isDrawerLoading } = useQuery({
    queryKey: ["cash-drawer", "current"],
    queryFn: fetchCurrentDrawer,
    refetchInterval: 30_000,
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["cash-drawer", "summary", drawer?.id],
    queryFn: () => fetchDrawerSummary(),
    enabled: Boolean(drawer),
    refetchInterval: 30_000,
  });

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["cash-drawer"] });
  }

  const openMutation = useMutation({
    mutationFn: () => openDrawer(Number(openingBalance)),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash drawer opened.");
      setOpeningBalance("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeDrawer(Number(closingBalance), closingNotes || undefined),
    onSuccess: (closed) => {
      // Only "current" — once closed there's no open session left for
      // "summary" to fetch, so refetching it would 404 against nothing.
      void queryClient.invalidateQueries({ queryKey: ["cash-drawer", "current"] });
      const diff = Number(closed.difference ?? 0);
      if (diff === 0) toast.success("Cash drawer closed. Balanced exactly.");
      else toast.warning(`Cash drawer closed. Difference: ${diff > 0 ? "+" : ""}${diff}.`);
      setClosingBalance("");
      setClosingNotes("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cashInMutation = useMutation({
    mutationFn: () => cashIn(Number(movementAmount), movementRemarks || undefined),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash in recorded.");
      setMovementAmount("");
      setMovementRemarks("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => cashOut(Number(movementAmount), movementRemarks || undefined),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash out recorded.");
      setMovementAmount("");
      setMovementRemarks("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isDrawerLoading) {
    return <Skeleton height={256} width="100%" radius="md" />;
  }

  if (!drawer) {
    return (
      <Stack gap="lg">
        <PageHeader title="Cash Drawer" description="No session is currently open." />
        <Card shadow="sm" padding="lg" radius="md" withBorder maw={400}>
          <Text fw={500} size="lg" mb="md">Open Cash Drawer</Text>
          <Stack gap="sm">
            <TextInput
              label="Opening balance"
              inputMode="decimal"
              placeholder="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
            <Button
              disabled={!openingBalance || openMutation.isPending}
              onClick={() => openMutation.mutate()}
              loading={openMutation.isPending}
              color="indigo"
            >
              Open Drawer
            </Button>
          </Stack>
        </Card>

        <DrawerHistorySection />
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <PageHeader
          title="Cash Drawer"
          description={`Opened ${new Date(drawer.openedAt).toLocaleString()} by ${drawer.cashier}`}
        />
        <Badge color="green" variant="light" size="lg">OPEN</Badge>
      </Group>

      {isSummaryLoading || !summary ? (
        <SimpleGrid cols={{ base: 2, md: 3, lg: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={88} radius="md" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 2, md: 3, lg: 4 }}>
          <StatCard label="Opening Cash" value={<MoneyText value={summary.openingCash} />} icon={Wallet} />
          <StatCard label="Sales Cash" value={<MoneyText value={summary.salesCash} />} icon={ShoppingCart} />
          <StatCard label="Cash In" value={<MoneyText value={summary.cashIn} />} icon={ArrowDownToLine} />
          <StatCard
            label="Refunds"
            value={<MoneyText value={summary.refunds} />}
            icon={RefreshCcw}
            tone={Number(summary.refunds) > 0 ? "warning" : "default"}
          />
          <StatCard label="Expenses" value={<MoneyText value={summary.expenses} />} icon={Banknote} tone={Number(summary.expenses) > 0 ? "warning" : "default"} />
          <StatCard label="Cash Out" value={<MoneyText value={summary.cashOut} />} icon={ArrowUpFromLine} />
          <StatCard label="Expected Closing" value={<MoneyText value={summary.expectedClosingCash} />} icon={Wallet} />
        </SimpleGrid>
      )}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={500} size="lg" mb="md">Cash In / Cash Out</Text>
          <Stack gap="sm">
            <TextInput
              inputMode="decimal"
              placeholder="Amount"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
            />
            <TextInput
              placeholder="Remarks (optional)"
              value={movementRemarks}
              onChange={(e) => setMovementRemarks(e.target.value)}
            />
            <Group grow>
              <Button
                variant="outline"
                disabled={!movementAmount || cashInMutation.isPending}
                onClick={() => cashInMutation.mutate()}
                loading={cashInMutation.isPending}
              >
                Cash In
              </Button>
              <Button
                variant="outline"
                disabled={!movementAmount || cashOutMutation.isPending}
                onClick={() => cashOutMutation.mutate()}
                loading={cashOutMutation.isPending}
              >
                Cash Out
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={500} size="lg" mb="md">Close Drawer</Text>
          <Stack gap="sm">
            <TextInput
              inputMode="decimal"
              placeholder={`Expected ~${summary?.expectedClosingCash ?? 0}`}
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
            />
            <TextInput
              placeholder="Notes (optional)"
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
            />
            <Button
              color="red"
              disabled={!closingBalance || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
              loading={closeMutation.isPending}
            >
              Close Drawer
            </Button>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={500} size="lg" mb="md">Session Details</Text>
          <Stack gap="xs" mt="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Opened</Text>
              <Text size="sm">{new Date(drawer.openedAt).toLocaleTimeString()}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Cashier</Text>
              <Text size="sm">{drawer.cashier}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Opening Balance</Text>
              <Text size="sm"><MoneyText value={drawer.openingBalance} /></Text>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          data={summary?.transactions ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle="No transactions yet"
          emptyDescription="Transactions for this session will appear here."
          columns={[
            {
              key: "type",
              header: "Type",
              render: (t) => (
                <Badge variant="outline" color="gray">
                  {t.type}
                </Badge>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              align: "right",
              render: (t) => <MoneyText value={t.amount} />,
            },
            {
              key: "reference",
              header: "Reference",
              render: (t) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {t.referenceNumber ?? "—"}
                </Text>
              ),
            },
            {
              key: "remarks",
              header: "Remarks",
              render: (t) => (
                <Text size="sm" c="dimmed">
                  {t.remarks ?? "—"}
                </Text>
              ),
            },
            {
              key: "time",
              header: "Time",
              render: (t) => (
                <Text size="sm">
                  {new Date(t.createdAt).toLocaleTimeString()}
                </Text>
              ),
            },
          ]}
        />
      </Paper>

      <DrawerHistorySection />
    </Stack>
  );
}

/** "Session history (for managers)" — API Spec 37.3's summary is per-session; this is every past session, paginated. */
function DrawerHistorySection() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["cash-drawer", "history", { page }],
    queryFn: () => fetchDrawerHistory({ page, limit: HISTORY_PAGE_SIZE }),
  });

  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
        <Text fw={500} size="lg">Session History</Text>
      </Box>
      <DataTable
        isLoading={isLoading}
        data={data?.data ?? []}
        keyExtractor={(row) => row.id}
        emptyTitle="No past sessions yet"
        emptyDescription="Past cash drawer sessions will appear here."
        columns={[
          {
            key: "cashier",
            header: "Cashier",
            render: (s) => (
              <Text size="sm" fw={500}>
                {s.cashier}
              </Text>
            ),
          },
          {
            key: "opened",
            header: "Opened",
            render: (s) => (
              <Text size="sm">
                {new Date(s.openedAt).toLocaleString()}
              </Text>
            ),
          },
          {
            key: "closed",
            header: "Closed",
            render: (s) => (
              <Text size="sm">
                {s.closedAt ? new Date(s.closedAt).toLocaleString() : "—"}
              </Text>
            ),
          },
          {
            key: "opening",
            header: "Opening",
            align: "right",
            render: (s) => <MoneyText value={s.openingBalance} />,
          },
          {
            key: "closing",
            header: "Closing",
            align: "right",
            render: (s) => (
              s.closingBalance !== null ? <MoneyText value={s.closingBalance} /> : <Text size="sm">—</Text>
            ),
          },
          {
            key: "difference",
            header: "Difference",
            align: "right",
            render: (s) => {
              if (s.difference !== null && Number(s.difference) !== 0) {
                const diff = Number(s.difference);
                return (
                  <Text size="sm" c={diff < 0 ? "red" : "orange"} fw={500}>
                    <MoneyText value={s.difference} />
                  </Text>
                );
              }
              return <Text size="sm">{s.difference ?? "—"}</Text>;
            },
          },
          {
            key: "status",
            header: "Status",
            render: (s) => (
              <Badge color={s.status === "OPEN" ? "green" : "gray"} variant="light" size="sm">
                {s.status}
              </Badge>
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
            limit={HISTORY_PAGE_SIZE}
            onPageChange={setPage}
          />
        </Box>
      )}
    </Paper>
  );
}
