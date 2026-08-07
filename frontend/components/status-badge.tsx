import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Active" : "Inactive"}</Badge>
  );
}
