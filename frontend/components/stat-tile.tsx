import type { LucideIcon } from "lucide-react";
import { Card, Group, Text, ThemeIcon } from "@mantine/core";

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical";
}

/** A single KPI tile — value carries meaning via text tokens + an icon, never color alone (dataviz skill). */
export function StatTile({ label, value, icon: Icon, tone = "default" }: StatTileProps) {
  const color = tone === "warning" ? "yellow" : tone === "critical" ? "red" : "gray";
  const textColor = tone === "warning" ? "yellow.8" : tone === "critical" ? "red.8" : undefined;

  return (
    <Card shadow="sm" radius="md" withBorder padding="md">
      <Group wrap="nowrap" gap="md">
        <ThemeIcon size={40} radius="md" variant="light" color={color}>
          <Icon size={20} />
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={700} c={textColor}>
            {value}
          </Text>
        </div>
      </Group>
    </Card>
  );
}
