"use client";

import { Modal, Text, Button, Group } from "@mantine/core";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>{title}</Text>}
      size="sm"
    >
      <Text size="sm" c="dimmed" mb="xl">
        {description}
      </Text>
      
      <Group justify="flex-end">
        <Button variant="default" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={isPending}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  );
}
