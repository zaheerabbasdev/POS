import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical";
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  warning: "text-amber-600 dark:text-amber-500",
  critical: "text-destructive",
};

/** A single KPI tile — value carries meaning via text tokens + an icon, never color alone (dataviz skill). */
export function StatTile({ label, value, icon: Icon, tone = "default" }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted", TONE_CLASSES[tone])}>
          <Icon className="size-4.5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={cn("text-lg font-semibold", TONE_CLASSES[tone])}>{value}</span>
        </div>
      </CardContent>
    </Card>
  );
}
