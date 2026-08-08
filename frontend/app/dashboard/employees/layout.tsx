import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["EMPLOYEE_VIEW", "EMPLOYEE_MANAGE"]}>{children}</RequirePermission>;
}
