import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["PURCHASE_VIEW", "PURCHASE_CREATE"]}>{children}</RequirePermission>;
}
