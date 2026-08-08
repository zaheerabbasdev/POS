import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["USER_VIEW", "USER_MANAGE"]}>{children}</RequirePermission>;
}
