"use client";

import { Table, Skeleton, Box, Stack, Text, ThemeIcon } from "@mantine/core";
import { PackageSearch } from "lucide-react";
import type { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Optional min-width for the column */
  minWidth?: number;
  /** Align content right (e.g. monetary values) */
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  keyExtractor: (row: T) => string;
}

/**
 * Reusable data table with built-in loading skeleton, empty state, and consistent styling.
 * Uses Mantine Table primitives — does NOT replace TanStack Query data fetching.
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  skeletonRows = 5,
  emptyTitle = "No data",
  emptyDescription = "There are no records to display.",
  keyExtractor,
}: DataTableProps<T>) {
  return (
    <Box style={{ overflowX: "auto" }}>
      <Table highlightOnHover withRowBorders>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th
                key={col.key}
                style={{
                  minWidth: col.minWidth,
                  textAlign: col.align ?? "left",
                  whiteSpace: "nowrap",
                }}
              >
                {col.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <Table.Tr key={i}>
                {columns.map((col) => (
                  <Table.Td key={col.key}>
                    <Skeleton height={16} radius="sm" />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          ) : data.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={columns.length}>
                <Stack align="center" py="xl" gap="xs">
                  <ThemeIcon
                    size={44}
                    radius="md"
                    style={{
                      backgroundColor: "var(--mantine-color-gray-1)",
                      color: "var(--mantine-color-gray-5)",
                      border: "none",
                    }}
                  >
                    <PackageSearch size={22} />
                  </ThemeIcon>
                  <Text fw={500} size="sm" c="dimmed">
                    {emptyTitle}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {emptyDescription}
                  </Text>
                </Stack>
              </Table.Td>
            </Table.Tr>
          ) : (
            data.map((row) => (
              <Table.Tr key={keyExtractor(row)}>
                {columns.map((col) => (
                  <Table.Td
                    key={col.key}
                    style={{ textAlign: col.align ?? "left" }}
                  >
                    {col.render(row)}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
