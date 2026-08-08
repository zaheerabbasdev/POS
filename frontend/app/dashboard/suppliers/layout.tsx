import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["SUPPLIER_VIEW", "SUPPLIER_MANAGE"]}>{children}</RequirePermission>;
}
