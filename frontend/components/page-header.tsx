"use client";

import { Group, Title, Text, Box, type MantineSpacing } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  mb?: MantineSpacing;
}

/**
 * Consistent page-level header with title, description, and action buttons.
 * Used at the top of every list and detail page.
 */
export function PageHeader({ title, description, actions, mb = "lg" }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start" mb={mb} wrap="nowrap">
      <Box>
        <Title order={1} size="h3" fw={600}>
          {title}
        </Title>
        {description && (
          <Text size="sm" c="dimmed" mt={2}>
            {description}
          </Text>
        )}
      </Box>
      {actions && (
        <Group gap="xs" style={{ flexShrink: 0 }}>
          {actions}
        </Group>
      )}
    </Group>
  );
}
