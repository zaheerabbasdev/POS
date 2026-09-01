"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  Modal,
  Stack,
  TextInput,
  Badge,
  Text,
  UnstyledButton,
  Group,
  ScrollArea,
} from "@mantine/core";
import { fetchSales, type SaleListItem } from "@/lib/api/sales";

interface PickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (sale: SaleListItem) => void;
}

export function PickSaleDialog({ open, onOpenChange, onPicked }: PickSaleDialogProps) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales", "return-picker"],
    queryFn: () => fetchSales({ limit: 100 }),
    enabled: open,
  });

  const filtered = query
    ? data?.data.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
          s.customer.toLowerCase().includes(query.toLowerCase()),
      )
    : data?.data;

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>Start a Return</Text>}
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">Find the original sale by invoice number or customer name.</Text>

        <TextInput
          autoFocus
          placeholder="Invoice # or customer..."
          leftSection={<Search size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />

        <ScrollArea h={300} type="always" offsetScrollbars style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: "var(--mantine-radius-md)" }}>
          {isLoading ? (
            <Text p="md" ta="center" size="sm" c="dimmed">Loading...</Text>
          ) : filtered && filtered.length > 0 ? (
            <Stack gap={0}>
              {filtered.map((sale) => (
                <UnstyledButton
                  key={sale.id}
                  onClick={() => onPicked(sale)}
                  style={{
                    padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <Stack gap={0}>
                    <Text ff="monospace" size="xs" c="dimmed">{sale.invoiceNumber}</Text>
                    <Text fw={500} size="sm">{sale.customer}</Text>
                  </Stack>
                  <Group gap="sm">
                    <Text size="sm" fw={500}>{sale.totalAmount}</Text>
                    {sale.isCancelled ? <Badge color="red" variant="light">Cancelled</Badge> : null}
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          ) : (
            <Text p="md" ta="center" size="sm" c="dimmed">No matching sales.</Text>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
