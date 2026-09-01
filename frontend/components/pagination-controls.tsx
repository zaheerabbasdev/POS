"use client";

import { Group, Text, Button, Box } from "@mantine/core";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared pagination controls — keeps the same props/behavior as the original;
 * only the visual presentation is updated to use Mantine components.
 * Backend pagination API is unchanged.
 */
export function PaginationControls({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationControlsProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <Group justify="space-between" px="xs" py="sm">
      <Text size="sm" c="dimmed">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
      </Text>

      <Group gap="xs">
        <Button
          variant="default"
          size="xs"
          leftSection={<ChevronLeft size={14} />}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>

        <Box
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            height: 28,
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: 6,
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Text size="xs" c="dimmed">
            {page} / {totalPages}
          </Text>
        </Box>

        <Button
          variant="default"
          size="xs"
          rightSection={<ChevronRight size={14} />}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </Group>
    </Group>
  );
}
