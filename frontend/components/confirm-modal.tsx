"use client";

import { Modal, Button, Text, Group, Stack, ThemeIcon, Box } from "@mantine/core";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  /** Explain WHAT will happen — not just "Are you sure?". */
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  /** Destructive actions (delete, cancel, archive) get a red confirm button. */
  variant?: "destructive" | "default";
}

/**
 * Reusable confirmation modal. Always explains the consequence, never just "Are you sure?".
 * Used for all delete / cancel / archive / deactivate flows.
 */
export function ConfirmModal({
  opened,
  onClose,
  title,
  description,
  confirmLabel = "Delete",
  isPending = false,
  onConfirm,
  variant = "destructive",
}: ConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={null}
      size="sm"
      centered
      withCloseButton={false}
    >
      <Stack gap="md">
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <ThemeIcon
            size={40}
            radius="md"
            style={{
              backgroundColor:
                variant === "destructive"
                  ? "var(--mantine-color-red-0)"
                  : "var(--mantine-color-yellow-0)",
              color:
                variant === "destructive"
                  ? "var(--mantine-color-red-6)"
                  : "var(--mantine-color-yellow-7)",
              border: "none",
              flexShrink: 0,
            }}
          >
            {variant === "destructive" ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </ThemeIcon>

          <Box>
            <Text fw={600} size="sm" mb={4}>
              {title}
            </Text>
            <Text size="sm" c="dimmed" lh={1.5}>
              {description}
            </Text>
          </Box>
        </Group>

        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            color={variant === "destructive" ? "red" : "yellow"}
            onClick={onConfirm}
            loading={isPending}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
