import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["PRODUCT_VIEW", "PRODUCT_MANAGE"]}>{children}</RequirePermission>;
}
