"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Box,
  Divider,
  Tooltip,
  UnstyledButton,
  Group,
  ThemeIcon,
  rem,
} from "@mantine/core";
import {
  LayoutDashboard,
  Package,
  Smartphone,
  Store,
  Tags,
  LayoutGrid,
  Warehouse,
  ShoppingCart,
  ReceiptText,
  ClipboardList,
  Truck,
  Users,
  UserCog,
  ShieldCheck,
  Wallet,
  Wrench,
  BadgeCheck,
  Contact,
  Banknote,
  BarChart3,
  Settings,
  History,
  Undo2,
  RotateCcw,
  CalendarClock,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchSettings } from "@/lib/api/settings";
import classes from "./app-sidebar.module.css";

// ─── Nav data (mirrors backend requirePermission exactly) ─────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  permissions?: string[];
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",      href: "/dashboard",              icon: LayoutDashboard },
  { title: "New Sale (POS)", href: "/dashboard/pos",          icon: ShoppingCart, permissions: ["SALE_CREATE"] },
  { title: "Subscription",   href: "/dashboard/subscription", icon: CalendarClock },
];

const TRANSACTION_NAV_ITEMS: NavItem[] = [
  { title: "Sales",             href: "/dashboard/sales",            icon: ReceiptText,   permissions: ["SALE_VIEW",     "SALE_CREATE"]    },
  { title: "Sales Returns",     href: "/dashboard/sales-returns",    icon: Undo2,         permissions: ["SALE_VIEW",     "SALE_CANCEL"]    },
  { title: "Purchases",         href: "/dashboard/purchases",        icon: ClipboardList, permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE"] },
  { title: "Purchase Returns",  href: "/dashboard/purchase-returns", icon: RotateCcw,     permissions: ["PURCHASE_VIEW", "PURCHASE_RETURN"] },
  { title: "Cash Drawer",       href: "/dashboard/cash-drawer",      icon: Wallet,        permissions: ["CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"] },
  { title: "Expenses",          href: "/dashboard/expenses",         icon: Banknote,      permissions: ["EXPENSE_VIEW",  "EXPENSE_MANAGE"] },
  { title: "Customers",         href: "/dashboard/customers",        icon: Users,         permissions: ["CUSTOMER_VIEW", "CUSTOMER_MANAGE"] },
  { title: "Suppliers",         href: "/dashboard/suppliers",        icon: Truck,         permissions: ["SUPPLIER_VIEW", "SUPPLIER_MANAGE"] },
];

const SERVICE_NAV_ITEMS: NavItem[] = [
  { title: "Repairs",    href: "/dashboard/repairs",    icon: Wrench,     permissions: ["REPAIR_VIEW",   "REPAIR_MANAGE"]   },
  { title: "Warranties", href: "/dashboard/warranties", icon: BadgeCheck, permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"] },
];

const INSIGHTS_NAV_ITEMS: NavItem[] = [
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3, permissions: ["REPORT_VIEW", "REPORT_EXPORT"] },
];

const CATALOG_NAV_ITEMS: NavItem[] = [
  { title: "Products",   href: "/dashboard/products",   icon: Package,     permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"]   },
  { title: "Inventory",  href: "/dashboard/inventory",  icon: Warehouse,   permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE"] },
  { title: "Brands",     href: "/dashboard/brands",     icon: Tags,        permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"]   },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid,  permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"]   },
  { title: "Models",     href: "/dashboard/models",     icon: Smartphone,  permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"]   },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Users",     href: "/dashboard/users",      icon: UserCog,     permissions: ["USER_VIEW",     "USER_MANAGE"]    },
  { title: "Roles",     href: "/dashboard/roles",      icon: ShieldCheck, permissions: ["ROLE_MANAGE"]                    },
  { title: "Employees", href: "/dashboard/employees",  icon: Contact,     permissions: ["EMPLOYEE_VIEW", "EMPLOYEE_MANAGE"] },
  { title: "Settings",  href: "/dashboard/settings",   icon: Settings,    permissions: ["SETTINGS_VIEW", "SETTINGS_MANAGE"] },
  { title: "Audit Log", href: "/dashboard/audit-logs", icon: History,     permissions: ["AUDIT_VIEW"]                     },
];

const NAV_GROUPS = [
  { label: "Menu",           items: MAIN_NAV_ITEMS,        flat: true  },
  { label: "Transactions",   items: TRANSACTION_NAV_ITEMS, flat: false },
  { label: "Service",        items: SERVICE_NAV_ITEMS,     flat: false },
  { label: "Insights",       items: INSIGHTS_NAV_ITEMS,    flat: false },
  { label: "Catalog",        items: CATALOG_NAV_ITEMS,     flat: false },
  { label: "Administration", items: ADMIN_NAV_ITEMS,       flat: false },
];

// ─── Sidebar widths ───────────────────────────────────────────────────────────

export const NAVBAR_WIDTH      = 240;
export const NAVBAR_WIDTH_SM   = 60;   // collapsed (icon-only)

// ─── Component ────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  collapsed: boolean;
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  const pathname   = usePathname();
  const { data: user }     = useCurrentUser();
  const permissions        = user?.permissions ?? [];

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });

  // Filter permission-gated items
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) =>
      !item.permissions || item.permissions.some((p) => permissions.includes(p)),
    ),
  })).filter((g) => g.items.length > 0);

  // Track open collapsible group
  const activeGroupLabel = visibleGroups.find(
    (g) => !g.flat && g.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )?.label;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupLabel ?? null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Box
      component="nav"
      style={{
        width: collapsed ? NAVBAR_WIDTH_SM : NAVBAR_WIDTH,
        minWidth: collapsed ? NAVBAR_WIDTH_SM : NAVBAR_WIDTH,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--mantine-color-gray-2)",
        backgroundColor: "var(--mantine-color-body)",
        transition: "width 200ms ease, min-width 200ms ease",
        flexShrink: 0,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* ─ Brand header ─────────────────────────────────────────────────────── */}
      <Box
        component={Link}
        href="/dashboard"
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
        {/* Logo / icon */}
        <Box
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 8,
            backgroundColor: "var(--mantine-color-indigo-6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {settings?.shop_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.shop_logo}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Store size={18} color="white" />
          )}
        </Box>

        {/* Shop name — hidden when collapsed */}
        {!collapsed && (
          <Box style={{ overflow: "hidden" }}>
            <Text fw={600} size="sm" lh={1.2} truncate>
              {settings?.shop_name || "Mobile Shop POS"}
            </Text>
            <Text size="xs" c="dimmed" lh={1.2}>
              Point of Sale
            </Text>
          </Box>
        )}
      </Box>

      {/* ─ Navigation ───────────────────────────────────────────────────────── */}
      <ScrollArea style={{ flex: 1 }} scrollbarSize={4}>
        <Stack gap={0} p={collapsed ? "xs" : "xs"} pt="sm">
          {visibleGroups.map((group) => (
            <NavGroup
              key={group.label}
              group={group}
              collapsed={collapsed}
              isActive={isActive}
              open={openGroup === group.label}
              onOpenChange={(open) => setOpenGroup(open ? group.label : null)}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Box>
  );
}

// ─── NavGroup ─────────────────────────────────────────────────────────────────

function NavGroup({
  group,
  collapsed,
  isActive,
  open,
  onOpenChange,
}: {
  group: { label: string; items: NavItem[]; flat: boolean };
  collapsed: boolean;
  isActive: (href: string) => boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (group.flat) {
    return (
      <Stack gap={2}>
        {!collapsed && (
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.05em" px="xs" mt={4} mb={2}>
            {group.label}
          </Text>
        )}
        {collapsed && <Divider my={4} />}
        {group.items.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}
      </Stack>
    );
  }

  // Collapsible group
  if (collapsed) {
    // Collapsed: show group icon → tooltip with sub-items is impractical,
    // so show all icons flat with a divider separator
    return (
      <Stack gap={2}>
        <Divider my={4} />
        {group.items.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap={2} mt={8}>
      <UnstyledButton
        onClick={() => onOpenChange(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 8px",
          borderRadius: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.05em">
          {group.label}
        </Text>
        <ChevronRight
          size={12}
          style={{
            color: "var(--mantine-color-gray-5)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </UnstyledButton>

      {open && (
        <Stack gap={2}>
          {group.items.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} active={isActive(item.href)} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  active,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Tooltip label={item.title} position="right" withArrow>
        <UnstyledButton
          component={Link}
          href={item.href}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 6,
            backgroundColor: active
              ? "var(--mantine-color-indigo-0)"
              : "transparent",
            color: active
              ? "var(--mantine-color-indigo-7)"
              : "var(--mantine-color-gray-6)",
            transition: "background-color 120ms ease, color 120ms ease",
            margin: "0 auto",
          }}
        >
          <Icon size={18} />
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <NavLink
      component={Link}
      href={item.href}
      label={item.title}
      leftSection={<Icon size={16} />}
      active={active}
      styles={{
        root: {
          borderRadius: 6,
          padding: "7px 10px",
          fontWeight: active ? 500 : 400,
          color: active ? "var(--mantine-color-indigo-7)" : "var(--mantine-color-gray-7)",
          backgroundColor: active ? "var(--mantine-color-indigo-0)" : "transparent",
          "&:hover": {
            backgroundColor: active
              ? "var(--mantine-color-indigo-1)"
              : "var(--mantine-color-gray-0)",
          },
        },
        label: {
          fontSize: "0.875rem",
        },
      }}
    />
  );
}
