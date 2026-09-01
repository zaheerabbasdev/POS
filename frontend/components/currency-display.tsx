"use client";

import { Text } from "@mantine/core";

interface CurrencyDisplayProps {
  value: number | string | null | undefined;
  currency?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fw?: number;
  c?: string;
  /** If true, renders positive values with a + prefix */
  showSign?: boolean;
}

/**
 * Consistent currency formatting across the application.
 * Handles null/undefined gracefully.
 */
export function CurrencyDisplay({
  value,
  currency = "",
  size = "sm",
  fw,
  c,
  showSign = false,
}: CurrencyDisplayProps) {
  if (value === null || value === undefined) {
    return (
      <Text size={size} fw={fw} c={c ?? "dimmed"}>
        —
      </Text>
    );
  }

  const num    = typeof value === "string" ? parseFloat(value) : value;
  const prefix = showSign && num > 0 ? "+" : "";
  const display = isNaN(num) ? String(value) : `${prefix}${currency}${num.toLocaleString()}`;

  return (
    <Text size={size} fw={fw} c={c} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </Text>
  );
}

/** Inline currency value that uses the value as-is (already formatted by the backend). */
export function MoneyText({
  value,
  fw,
  size = "sm",
  c,
}: {
  value: string | number | null | undefined;
  fw?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  c?: string;
}) {
  return (
    <Text
      size={size}
      fw={fw}
      c={c}
      style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--mantine-font-family-monospace)" }}
    >
      {value ?? "—"}
    </Text>
  );
}
