import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TenantRedirectGuard } from "@/components/tenant-redirect-guard";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <SidebarProvider>
      <TenantRedirectGuard expect="shop" />
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-4 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
