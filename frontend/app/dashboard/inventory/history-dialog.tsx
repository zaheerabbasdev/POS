"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Modal,
  Text,
  Badge,
  Table,
  ScrollArea,
  Center,
} from "@mantine/core";
import { fetchStockHistory, type InventoryItem } from "@/lib/api/inventory";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
}

export function HistoryDialog({ open, onOpenChange, item }: HistoryDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-history", item?.productId],
    queryFn: () => fetchStockHistory(item!.productId),
    enabled: open && Boolean(item),
  });

  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>Stock movement history</Text>}
      size="lg"
    >
      <Text size="sm" c="dimmed" mb="md">{item?.name}</Text>

      <ScrollArea h={400} type="always" offsetScrollbars>
        <Table stickyHeader>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th ta="right">Qty</Table.Th>
              <Table.Th>Remarks</Table.Th>
              <Table.Th>Date</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Center p="md">
                    <Text c="dimmed" size="sm">Loading...</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            ) : data && data.length > 0 ? (
              data.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Badge variant="outline" color="gray">{entry.type}</Badge>
                  </Table.Td>
                  <Table.Td ta="right" c={entry.quantity < 0 ? "red" : "indigo"} fw={500}>
                    {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                  </Table.Td>
                  <Table.Td c="dimmed">{entry.remarks ?? "—"}</Table.Td>
                  <Table.Td c="dimmed">{format(new Date(entry.createdAt), "MMM d, yyyy p")}</Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Center p="md">
                    <Text c="dimmed" size="sm">No stock movements yet.</Text>
                  </Center>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Modal>
  );
}
