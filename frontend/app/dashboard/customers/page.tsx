"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Pencil, History as HistoryIcon } from "lucide-react";
import {
  Paper,
  Stack,
  Group,
  TextInput,
  Button,
  Text,
  Badge,
  Box,
  Modal,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { ActionMenu } from "@/components/action-menu";
import { MoneyText } from "@/components/currency-display";
import { fetchCustomerHistory, fetchCustomers, type Customer, type CustomerHistory } from "@/lib/api/customers";
import { CustomerFormDialog } from "./customer-form-dialog";

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { search, page }],
    queryFn: () => fetchCustomers({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const openCreate = () => {
    setEditingCustomer(undefined);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Customers"
        description="Manage customer records and outstanding balances."
        actions={
          <Button onClick={openCreate} leftSection={<Plus size={16} />} color="indigo">
            Add Customer
          </Button>
        }
      />

      <Group gap="sm">
        <TextInput
          placeholder="Search by name, phone, or code…"
          leftSection={<Search size={15} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 300 }}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <DataTable
          isLoading={isLoading}
          data={data?.data ?? []}
          keyExtractor={(row) => row.id}
          emptyTitle={search ? "No matching customers" : "No customers yet"}
          emptyDescription={
            search
              ? "No customers match your search."
              : "Add your first customer to start tracking history and balances."
          }
          columns={[
            {
              key: "code",
              header: "Code",
              render: (c) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {c.customerCode}
                </Text>
              ),
            },
            {
              key: "name",
              header: "Name",
              render: (c) => (
                <Text size="sm" fw={500}>
                  {c.name}
                </Text>
              ),
            },
            {
              key: "phone",
              header: "Phone",
              render: (c) => (
                <Text size="sm" c="dimmed">
                  {c.phone ?? "—"}
                </Text>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (c) => (
                <Badge variant="outline" color="gray" size="sm">
                  {c.customerType}
                </Badge>
              ),
            },
            {
              key: "outstanding",
              header: "Outstanding",
              align: "right",
              render: (c) => (
                <MoneyText
                  value={c.outstandingBalance}
                  c={Number(c.outstandingBalance) > 0 ? "red" : undefined}
                  fw={Number(c.outstandingBalance) > 0 ? 500 : undefined}
                />
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (c) => <StatusBadge status={c.status} type="generic" />,
            },
            {
              key: "actions",
              header: "",
              render: (c) => (
                <ActionMenu
                  items={[
                    {
                      label: "View History",
                      icon: <HistoryIcon size={14} />,
                      onClick: () => setHistoryCustomer(c),
                    },
                    {
                      label: "Edit",
                      icon: <Pencil size={14} />,
                      onClick: () => openEdit(c),
                    },
                  ]}
                />
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

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />
      <CustomerHistoryDialog customer={historyCustomer} onOpenChange={(open) => !open && setHistoryCustomer(undefined)} />
    </Stack>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function CustomerHistoryDialog({
  customer,
  onOpenChange,
}: {
  customer?: Customer;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery<CustomerHistory>({
    queryKey: ["customers", customer?.id, "history"],
    queryFn: () => fetchCustomerHistory(customer!.id),
    enabled: Boolean(customer),
  });

  return (
    <Modal
      opened={Boolean(customer)}
      onClose={() => onOpenChange(false)}
      title={`${customer?.name} - Purchase History`}
      size="lg"
    >
      <Text size="sm" c="dimmed" mb="md">
        Sales and payments recorded for this customer.
      </Text>
      
      {isLoading ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          Loading history...
        </Text>
      ) : data && data.sales.length > 0 ? (
        <Stack gap="md">
          <DataTable
            data={data.sales}
            keyExtractor={(row) => row.id}
            columns={[
              {
                key: "invoice",
                header: "Invoice",
                render: (s) => (
                  <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                    {s.invoiceNumber}
                  </Text>
                ),
              },
              {
                key: "date",
                header: "Date",
                render: (s) => (
                  <Text size="sm">
                    {new Date(s.saleDate).toLocaleDateString()}
                  </Text>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (s) => <StatusBadge status={s.paymentStatus} type="sale" />,
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                render: (s) => <MoneyText value={s.totalAmount} fw={500} />,
              },
            ]}
          />
          <Text ta="right" size="sm" fw={600}>
            Outstanding: <MoneyText value={data.outstandingBalance} c={Number(data.outstandingBalance) > 0 ? "red" : undefined} />
          </Text>
        </Stack>
      ) : (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No purchases found for this customer.
        </Text>
      )}
    </Modal>
  );
}
