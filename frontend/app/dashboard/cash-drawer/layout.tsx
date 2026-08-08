import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"]}>{children}</RequirePermission>;
}
