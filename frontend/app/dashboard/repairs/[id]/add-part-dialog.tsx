"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  SimpleGrid,
  TextInput,
  Select,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { fetchProducts } from "@/lib/api/products";
import { addRepairItem } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api-client";

interface AddPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairId: string;
}

export function AddPartDialog({ open, onOpenChange, repairId }: AddPartDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>Record Part Used</Text>}
      size="md"
    >
      {open ? <AddPartDialogBody repairId={repairId} onOpenChange={onOpenChange} /> : null}
    </Modal>
  );
}

function AddPartDialogBody({ repairId, onOpenChange }: { repairId: string; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products", { forSelect: true }],
    queryFn: () => fetchProducts({ status: "active", limit: 100 }),
  });
  const productItems = useMemo(
    () => (products?.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
    [products],
  );

  const mutation = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error("Product ID is required");
      return addRepairItem(repairId, { productId, quantity: Number(quantity), unitPrice: Number(unitPrice) });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["repairs", repairId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Part recorded and stock updated.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">Deducts the quantity from stock and adds it to this repair.</Text>

      <Stack gap="sm">
        <Select
          label="Part / Product"
          placeholder="Select product"
          data={productItems}
          value={productId}
          onChange={setProductId}
          searchable
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.currentTarget.value)}
          />
          <TextInput
            label="Unit Price"
            inputMode="decimal"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.currentTarget.value)}
          />
        </SimpleGrid>
      </Stack>

      <Group justify="flex-end" mt="md">
        <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          color="indigo"
          disabled={!productId || !quantity || !unitPrice || mutation.isPending}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Add Part
        </Button>
      </Group>
    </Stack>
  );
}
