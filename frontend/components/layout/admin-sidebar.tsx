"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink, ScrollArea, Stack, Text, Box, Divider, rem } from "@mantine/core";
import { LayoutDashboard, Store, ShieldCheck, CreditCard, BarChart3, type LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

// Deliberately separate from app-sidebar.tsx (spec §56 — Platform Admin
// navigation is never mixed with shop POS navigation).
const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",          href: "/admin/dashboard",           icon: LayoutDashboard },
  { title: "Shops",              href: "/admin/shops",               icon: Store           },
  { title: "Subscription Plans", href: "/admin/subscription-plans",  icon: CreditCard      },
  { title: "Reports",            href: "/admin/reports",             icon: BarChart3       },
];

export interface AdminSidebarProps {
  collapsed: boolean;
}

export function AdminSidebar({ collapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Box
      component="nav"
      style={{
        width: collapsed ? 60 : 240,
        minWidth: collapsed ? 60 : 240,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--mantine-color-gray-2)",
        backgroundColor: "var(--mantine-color-body)",
        transition: "width 200ms ease, min-width 200ms ease",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Brand header */}
      <Box
        component={Link}
        href="/admin/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: collapsed ? "1rem 0" : "1rem 1rem",
          justifyContent: collapsed ? "center" : "flex-start",
          textDecoration: "none",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
          flexShrink: 0,
          minHeight: 64,
        }}
      >
        <Box
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 8,
            backgroundColor: "var(--mantine-color-violet-7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={18} color="white" />
        </Box>

        {!collapsed && (
          <Box>
            <Text fw={600} size="sm" lh={1.2}>Platform Admin</Text>
            <Text size="xs" c="dimmed" lh={1.2}>Mobile Shop POS</Text>
          </Box>
        )}
      </Box>

      <ScrollArea style={{ flex: 1 }} scrollbarSize={4}>
        <Stack gap={2} p="xs" pt="sm">
          {!collapsed && (
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.05em" px="xs" mb={4}>
              Menu
            </Text>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (collapsed) {
              return (
                <Box
                  key={item.href}
                  component={Link}
                  href={item.href}
                  title={item.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: active ? "var(--mantine-color-violet-0)" : "transparent",
                    color: active ? "var(--mantine-color-violet-7)" : "var(--mantine-color-gray-6)",
                    margin: "0 auto",
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} />
                </Box>
              );
            }

            return (
              <NavLink
                key={item.href}
                component={Link}
                href={item.href}
                label={item.title}
                leftSection={<Icon size={16} />}
                active={active}
                styles={{
                  root: {
                    borderRadius: 6,
                    padding: "7px 10px",
                    color: active ? "var(--mantine-color-violet-7)" : "var(--mantine-color-gray-7)",
                    backgroundColor: active ? "var(--mantine-color-violet-0)" : "transparent",
                  },
                  label: { fontSize: "0.875rem" },
                }}
              />
            );
          })}
        </Stack>
      </ScrollArea>
    </Box>
  );
}
