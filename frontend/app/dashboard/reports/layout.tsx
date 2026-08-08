import { RequirePermission } from "@/components/require-permission";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequirePermission permissions={["REPORT_VIEW", "REPORT_EXPORT"]}>{children}</RequirePermission>;
}
