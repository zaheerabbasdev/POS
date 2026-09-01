"use client";

import { useState } from "react";
import { Box, Drawer } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TenantRedirectGuard } from "@/components/tenant-redirect-guard";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <TenantRedirectGuard expect="platform" />

      {/* Mobile drawer */}
      <Drawer
        opened={mobileOpen && (isMobile ?? false)}
        onClose={closeMobile}
        size={240}
        padding={0}
        withCloseButton={false}
        hiddenFrom="sm"
        styles={{ body: { padding: 0, height: "100%" } }}
      >
        <AdminSidebar collapsed={false} />
      </Drawer>

      <Box style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Box visibleFrom="sm">
          <AdminSidebar collapsed={collapsed} />
        </Box>

        <Box style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <DashboardHeader
            label="Platform Admin"
            onToggleMobile={toggleMobile}
            mobileOpen={mobileOpen}
            onToggleCollapse={() => setCollapsed((c) => !c)}
            collapsed={collapsed}
          />

          <Box
            component="main"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}
