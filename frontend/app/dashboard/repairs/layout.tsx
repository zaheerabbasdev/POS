import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["REPAIR_VIEW", "REPAIR_MANAGE"]}>{children}</RequirePermission>;
}
