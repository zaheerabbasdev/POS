import { Badge } from "@/components/ui/badge";
import type { ShopStatus } from "@/lib/api/shops";

const VARIANTS: Record<ShopStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  TRIAL: { label: "Trial", variant: "outline" },
  ACTIVE: { label: "Active", variant: "default" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "secondary" },
};

export function ShopStatusBadge({ status }: { status: ShopStatus }) {
  const { label, variant } = VARIANTS[status];
  return <Badge variant={variant}>{label}</Badge>;
}
