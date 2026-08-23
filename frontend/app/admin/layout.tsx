import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TenantRedirectGuard } from "@/components/tenant-redirect-guard";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <SidebarProvider>
      <TenantRedirectGuard expect="platform" />
      <AdminSidebar />
      <SidebarInset>
        <DashboardHeader label="Platform Admin" />
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
