import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["SETTINGS_VIEW", "SETTINGS_MANAGE"]}>{children}</RequirePermission>;
}
