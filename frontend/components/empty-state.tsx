"use client";

import { Stack, Text, ThemeIcon, Button } from "@mantine/core";
import { PackageSearch, SearchX, Filter, ShieldAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type EmptyStateVariant = "no-data" | "no-results" | "no-filter-results" | "no-permission";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: LucideIcon;
}

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string; color: string }
> = {
  "no-data": {
    icon: PackageSearch,
    title: "No records yet",
    description: "Nothing has been added here yet.",
    color: "gray",
  },
  "no-results": {
    icon: SearchX,
    title: "No results found",
    description: "No records match your search. Try adjusting your search term.",
    color: "gray",
  },
  "no-filter-results": {
    icon: Filter,
    title: "No matching records",
    description: "No records match the selected filters. Try resetting your filters.",
    color: "gray",
  },
  "no-permission": {
    icon: ShieldAlert,
    title: "Access restricted",
    description:
      "You don't have permission to view this information. Contact an administrator to request access.",
    color: "red",
  },
};

/** Contextual empty state — differentiates between no data, no search results, and permission issues. */
export function EmptyState({
  variant = "no-data",
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const Icon     = icon ?? defaults.icon;
  const iconColor = defaults.color;

  return (
    <Stack align="center" py="3rem" gap="sm">
      <ThemeIcon
        size={56}
        radius="lg"
        style={{
          backgroundColor: `var(--mantine-color-${iconColor}-0)`,
          color: `var(--mantine-color-${iconColor}-5)`,
          border: "none",
        }}
      >
        <Icon size={26} />
      </ThemeIcon>

      <Stack gap={4} align="center">
        <Text fw={600} size="sm">
          {title ?? defaults.title}
        </Text>
        <Text size="sm" c="dimmed" ta="center" style={{ maxWidth: 360 }}>
          {description ?? defaults.description}
        </Text>
      </Stack>

      {action && (
        <Button variant="light" size="sm" mt="xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
