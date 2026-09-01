"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { Printer } from "lucide-react";
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
  Paper,
  Skeleton,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/currency-display";
import { ConfirmModal } from "@/components/confirm-modal";
import { fetchSale, cancelSale } from "@/lib/api/sales";
import { createPayment } from "@/lib/api/payments";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";
import { SalesReturnDialog } from "./sales-return-dialog";

export default function SaleDetailPage(props: PageProps<"/dashboard/sales/[id]">) {
  const { id } = use(props.params);
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sales", id],
    queryFn: () => fetchSale(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(id, "Cancelled from sale detail screen"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Sale cancelled.");
      setCancelOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      createPayment({
        type: "customer",
        referenceId: id,
        amount: Number(paymentAmount),
        method: paymentMethod,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", id] });
      toast.success("Payment recorded.");
      setPaymentAmount("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !sale) {
    return <Skeleton height={256} width="100%" radius="md" />;
  }

  const paymentMethodOptions = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title={`Invoice ${sale.invoiceNumber}`}
          description={`${sale.customer?.name ?? "Walk-in customer"} · ${new Date(sale.saleDate).toLocaleDateString()} · Cashier: ${sale.cashier ?? "—"}`}
        />
        <Group>
          <Badge
            color={
              sale.status === "PAID" ? "green" : sale.status === "PARTIAL" ? "orange" : "red"
            }
            variant="light"
            size="lg"
          >
            {sale.status}
          </Badge>
          {sale.isCancelled && (
            <Badge color="red" variant="filled" size="lg">
              Cancelled
            </Badge>
          )}
          <Button
            component={Link}
            href={`/print/sales/${sale.id}`}
            target="_blank"
            variant="outline"
            leftSection={<Printer size={16} />}
          >
            Print Invoice
          </Button>
          {!sale.isCancelled && (
            <Button variant="outline" onClick={() => setReturnOpen(true)}>
              Return Items
            </Button>
          )}
          {!sale.isCancelled && (
            <Button variant="outline" color="red" onClick={() => setCancelOpen(true)}>
              Cancel Sale
            </Button>
          )}
        </Group>
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600} size="lg">Items</Text>
        </Box>
        <DataTable
          data={sale.items}
          keyExtractor={(row) => row.id}
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
              header: "Product",
              render: (item) => <Text size="sm" fw={500}>{item.name}</Text>,
            },
            {
              key: "imei",
              header: "IMEI",
              render: (item) => (
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {item.imei ?? "—"}
                </Text>
              ),
            },
            {
              key: "qty",
              header: "Qty",
              align: "right",
              render: (item) => <Text size="sm">{item.quantity}</Text>,
            },
            {
              key: "price",
              header: "Price",
              align: "right",
              render: (item) => <MoneyText value={item.price} />,
            },
            {
              key: "lineTotal",
              header: "Line Total",
              align: "right",
              render: (item) => <MoneyText value={item.lineTotal} />,
            },
            {
              key: "warranty",
              header: "Warranty",
              render: (item) =>
                item.warranty ? (
                  <Badge variant="light" color={item.warranty.status === "ACTIVE" ? "blue" : "gray"}>
                    {item.warranty.periodMonths}mo — {item.warranty.status}
                  </Badge>
                ) : (
                  <Text size="sm">—</Text>
                ),
            },
          ]}
        />
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Summary</Text>
          <Stack gap="xs" mt="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Subtotal</Text>
              <Text size="sm"><MoneyText value={sale.subtotal} /></Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Discount</Text>
              <Text size="sm">-<MoneyText value={sale.discount} /></Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" fw={600}>Total</Text>
              <Text size="sm" fw={600}><MoneyText value={sale.totalAmount} /></Text>
            </Group>
            <Box mt="xs" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
              <Group justify="space-between" mt="xs">
                <Text size="sm" c="dimmed">Paid</Text>
                <Text size="sm"><MoneyText value={sale.paidAmount} /></Text>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text size="sm" c="dimmed">Due</Text>
                <Text size="sm" c={Number(sale.dueAmount) > 0 ? "red" : undefined} fw={Number(sale.dueAmount) > 0 ? 600 : undefined}>
                  <MoneyText value={sale.dueAmount} />
                </Text>
              </Group>
            </Box>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Payments</Text>
          {sale.payments.length > 0 ? (
            <Stack gap="xs">
              {sale.payments.map((payment) => (
                <Group key={payment.id} justify="space-between">
                  <Text size="sm" c="dimmed">
                    {payment.type} · {payment.method} · {new Date(payment.date).toLocaleDateString()}
                  </Text>
                  <Text size="sm"><MoneyText value={payment.amount} /></Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">No payments recorded.</Text>
          )}
        </Card>

        {!sale.isCancelled && Number(sale.dueAmount) > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={600} size="lg" mb="md">Record Payment</Text>
            <Stack gap="sm">
              <Select
                data={paymentMethodOptions}
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v ?? "cash")}
              />
              <TextInput
                inputMode="decimal"
                placeholder={`Up to ${sale.dueAmount}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <Button
                disabled={!paymentAmount || paymentMutation.isPending}
                loading={paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
                color="indigo"
              >
                Record Payment
              </Button>
            </Stack>
          </Card>
        )}
      </SimpleGrid>

      <ConfirmModal
        opened={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this sale?"
        description="Inventory will be restored, IMEIs freed, and any warranty cancelled. Paid amounts are refunded as a record — nothing is deleted."
        confirmLabel="Cancel Sale"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <SalesReturnDialog open={returnOpen} onOpenChange={setReturnOpen} sale={sale} />
    </Stack>
  );
}
