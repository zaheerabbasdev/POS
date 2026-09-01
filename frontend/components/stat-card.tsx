"use client";

import { Paper, Group, Stack, Text, ThemeIcon, type MantineColor } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

type StatCardTone = "default" | "warning" | "critical" | "success" | "info";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatCardTone;
  supporting?: string;
}

const TONE_CONFIG: Record<
  StatCardTone,
  { color: MantineColor; bg: string; text: string }
> = {
  default:  { color: "indigo",  bg: "var(--mantine-color-indigo-0)",  text: "var(--mantine-color-indigo-7)"  },
  success:  { color: "green",   bg: "var(--mantine-color-green-0)",   text: "var(--mantine-color-green-7)"   },
  warning:  { color: "orange",  bg: "var(--mantine-color-orange-0)",  text: "var(--mantine-color-orange-7)"  },
  critical: { color: "red",     bg: "var(--mantine-color-red-0)",     text: "var(--mantine-color-red-7)"     },
  info:     { color: "blue",    bg: "var(--mantine-color-blue-0)",    text: "var(--mantine-color-blue-7)"    },
};

/**
 * KPI stat card for dashboards.
 * Communicates status via icon + text + color — never color alone.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  supporting,
}: StatCardProps) {
  const cfg = TONE_CONFIG[tone];

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      shadow="xs"
      style={{ backgroundColor: "var(--mantine-color-body)" }}
    >
      <Group gap="md" wrap="nowrap" align="flex-start">
        <ThemeIcon
          size={42}
          radius="md"
          style={{
            backgroundColor: cfg.bg,
            color: cfg.text,
            border: "none",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </ThemeIcon>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase" lts="0.04em" lh={1.2}>
            {label}
          </Text>
          <Text
            size="xl"
            fw={700}
            lh={1.2}
            style={{ color: cfg.text }}
          >
            {value}
          </Text>
          {supporting && (
            <Text size="xs" c="dimmed">
              {supporting}
            </Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}
