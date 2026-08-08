import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["WARRANTY_VIEW", "WARRANTY_MANAGE"]}>{children}</RequirePermission>;
}
