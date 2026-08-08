import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["CUSTOMER_VIEW", "CUSTOMER_MANAGE"]}>{children}</RequirePermission>;
}
