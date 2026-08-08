import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["EXPENSE_VIEW", "EXPENSE_MANAGE"]}>{children}</RequirePermission>;
}
