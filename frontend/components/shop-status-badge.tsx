import { Badge } from "@mantine/core";
import type { ShopStatus } from "@/lib/api/shops";

const VARIANTS: Record<ShopStatus, { label: string; color: string }> = {
  TRIAL: { label: "Trial", color: "indigo" },
  ACTIVE: { label: "Active", color: "green" },
  EXPIRED: { label: "Expired", color: "red" },
  SUSPENDED: { label: "Suspended", color: "red" },
  CANCELLED: { label: "Cancelled", color: "gray" },
};

export function ShopStatusBadge({ status }: { status: ShopStatus }) {
  const { label, color } = VARIANTS[status];
  return <Badge color={color} variant="light">{label}</Badge>;
}
