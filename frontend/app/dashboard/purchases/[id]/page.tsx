"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Stack,
  Group,
  Button,
  Text,
  Badge,
  Card,
  SimpleGrid,
  Paper,
  Skeleton,
  Box,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/currency-display";
import { fetchPurchase } from "@/lib/api/purchases";
import { PurchaseReturnDialog } from "./purchase-return-dialog";
import { PurchaseEditDialog } from "./purchase-edit-dialog";

export default function PurchaseDetailPage(props: PageProps<"/dashboard/purchases/[id]">) {
  const { id } = use(props.params);
  const [returnOpen, setReturnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchases", id],
    queryFn: () => fetchPurchase(id),
  });

  if (isLoading || !purchase) {
    return <Skeleton height={256} width="100%" radius="md" />;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <PageHeader
          title={`Purchase ${purchase.invoiceNo}`}
          description={`${purchase.supplier.name} · ${new Date(purchase.purchaseDate).toLocaleDateString()}`}
        />
        <Group>
          <Badge
            color={
              purchase.status === "PAID" ? "green" : purchase.status === "PARTIAL" ? "orange" : "red"
            }
            variant="light"
            size="lg"
          >
            {purchase.status}
          </Badge>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="outline" onClick={() => setReturnOpen(true)}>
            Return Items
          </Button>
        </Group>
      </Group>

      <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
        <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600} size="lg">Items</Text>
        </Box>
        <DataTable
          data={purchase.items}
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
              key: "qty",
              header: "Qty",
              align: "right",
              render: (item) => <Text size="sm">{item.quantity}</Text>,
            },
            {
              key: "price",
              header: "Price",
              align: "right",
              render: (item) => <MoneyText value={item.purchasePrice} />,
            },
            {
              key: "lineTotal",
              header: "Line Total",
              align: "right",
              render: (item) => <MoneyText value={item.lineTotal} />,
            },
            {
              key: "imeis",
              header: "IMEIs",
              render: (item) => (
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {item.imeis.join(", ") || "—"}
                </Text>
              ),
            },
          ]}
        />
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Summary</Text>
          <Stack gap="xs" mt="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Subtotal</Text>
              <Text size="sm"><MoneyText value={purchase.subtotal} /></Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Discount</Text>
              <Text size="sm">-<MoneyText value={purchase.discount} /></Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Tax</Text>
              <Text size="sm"><MoneyText value={purchase.tax} /></Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Shipping</Text>
              <Text size="sm"><MoneyText value={purchase.shippingCost} /></Text>
            </Group>
            <Box mt="xs" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
              <Group justify="space-between" mt="xs">
                <Text size="sm" fw={600}>Total</Text>
                <Text size="sm" fw={600}><MoneyText value={purchase.totalAmount} /></Text>
              </Group>
            </Box>
            {purchase.remarks && (
              <Box mt="xs" pt="xs" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
                <Text size="sm" c="dimmed" mb={4}>Remarks</Text>
                <Text size="sm">{purchase.remarks}</Text>
              </Box>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} size="lg" mb="md">Payments</Text>
          {purchase.payments.length > 0 ? (
            <Stack gap="xs">
              {purchase.payments.map((payment) => (
                <Group key={payment.id} justify="space-between">
                  <Text size="sm" c="dimmed">
                    {payment.method} · {new Date(payment.date).toLocaleDateString()}
                  </Text>
                  <Text size="sm"><MoneyText value={payment.amount} /></Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">No payments recorded.</Text>
          )}
        </Card>
      </SimpleGrid>

      <PurchaseReturnDialog open={returnOpen} onOpenChange={setReturnOpen} purchase={purchase} />
      <PurchaseEditDialog open={editOpen} onOpenChange={setEditOpen} purchase={purchase} />
    </Stack>
  );
}
