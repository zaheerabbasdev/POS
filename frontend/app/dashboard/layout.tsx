"use client";

import { useState } from "react";
import { AppShell, Drawer, Box } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { AppSidebar, NAVBAR_WIDTH, NAVBAR_WIDTH_SM } from "@/components/layout/app-sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { TenantRedirectGuard } from "@/components/tenant-redirect-guard";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [mobileOpen, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useState(false);

  const navbarWidth = collapsed ? NAVBAR_WIDTH_SM : NAVBAR_WIDTH;

  return (
    <>
      <TenantRedirectGuard expect="shop" />

      {/* Mobile: full-width drawer */}
      <Drawer
        opened={mobileOpen && (isMobile ?? false)}
        onClose={closeMobile}
        size={NAVBAR_WIDTH}
        padding={0}
        withCloseButton={false}
        hiddenFrom="sm"
        styles={{ body: { padding: 0, height: "100%" } }}
      >
        <AppSidebar collapsed={false} />
      </Drawer>

      {/* Desktop: inline sidebar */}
      <Box
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Box visibleFrom="sm">
          <AppSidebar collapsed={collapsed} />
        </Box>

        {/* Main area */}
        <Box
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <DashboardHeader
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
