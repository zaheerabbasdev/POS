"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  Modal,
  Stack,
  TextInput,
  Text,
  UnstyledButton,
  Group,
  ScrollArea,
} from "@mantine/core";
import { fetchPurchases, type PurchaseListItem } from "@/lib/api/purchases";

interface PickPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (purchase: PurchaseListItem) => void;
}

export function PickPurchaseDialog({ open, onOpenChange, onPicked }: PickPurchaseDialogProps) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", "return-picker"],
    queryFn: () => fetchPurchases({ limit: 100 }),
    enabled: open,
  });

  const filtered = query
    ? data?.data.filter(
        (p) =>
          p.invoiceNo.toLowerCase().includes(query.toLowerCase()) || p.supplier.toLowerCase().includes(query.toLowerCase()),
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
        <Text size="sm" c="dimmed">Find the original purchase by purchase number or supplier name.</Text>

        <TextInput
          autoFocus
          placeholder="Purchase # or supplier..."
          leftSection={<Search size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />

        <ScrollArea h={300} type="always" offsetScrollbars style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: "var(--mantine-radius-md)" }}>
          {isLoading ? (
            <Text p="md" ta="center" size="sm" c="dimmed">Loading...</Text>
          ) : filtered && filtered.length > 0 ? (
            <Stack gap={0}>
              {filtered.map((purchase) => (
                <UnstyledButton
                  key={purchase.id}
                  onClick={() => onPicked(purchase)}
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
                    <Text ff="monospace" size="xs" c="dimmed">{purchase.invoiceNo}</Text>
                    <Text fw={500} size="sm">{purchase.supplier}</Text>
                  </Stack>
                  <Text size="sm" fw={500}>{purchase.totalAmount}</Text>
                </UnstyledButton>
              ))}
            </Stack>
          ) : (
            <Text p="md" ta="center" size="sm" c="dimmed">No matching purchases.</Text>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
