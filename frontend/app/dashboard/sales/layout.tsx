import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["SALE_VIEW", "SALE_CREATE"]}>{children}</RequirePermission>;
}
