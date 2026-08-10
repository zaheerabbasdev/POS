"use client";

import Link from "next/link";
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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchSettings } from "@/lib/api/settings";

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Any one of these grants visibility — mirrors the backend's requirePermission(...) for the same route. Omit for "everyone logged in". */
  permissions?: string[];
}

// Grows one entry at a time as each module gets a frontend page.
const MAIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "New Sale (POS)", href: "/dashboard/pos", icon: ShoppingCart, permissions: ["SALE_CREATE"] },
];

const TRANSACTION_NAV_ITEMS: NavItem[] = [
  { title: "Sales", href: "/dashboard/sales", icon: ReceiptText, permissions: ["SALE_VIEW", "SALE_CREATE"] },
  { title: "Sales Returns", href: "/dashboard/sales-returns", icon: Undo2, permissions: ["SALE_VIEW", "SALE_CANCEL"] },
  { title: "Purchases", href: "/dashboard/purchases", icon: ClipboardList, permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE"] },
  {
    title: "Purchase Returns",
    href: "/dashboard/purchase-returns",
    icon: RotateCcw,
    permissions: ["PURCHASE_VIEW", "PURCHASE_RETURN"],
  },
  { title: "Cash Drawer", href: "/dashboard/cash-drawer", icon: Wallet, permissions: ["CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"] },
  { title: "Expenses", href: "/dashboard/expenses", icon: Banknote, permissions: ["EXPENSE_VIEW", "EXPENSE_MANAGE"] },
  { title: "Customers", href: "/dashboard/customers", icon: Users, permissions: ["CUSTOMER_VIEW", "CUSTOMER_MANAGE"] },
  { title: "Suppliers", href: "/dashboard/suppliers", icon: Truck, permissions: ["SUPPLIER_VIEW", "SUPPLIER_MANAGE"] },
];

const INSIGHTS_NAV_ITEMS: NavItem[] = [
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3, permissions: ["REPORT_VIEW", "REPORT_EXPORT"] },
];

const SERVICE_NAV_ITEMS: NavItem[] = [
  { title: "Repairs", href: "/dashboard/repairs", icon: Wrench, permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"] },
  { title: "Warranties", href: "/dashboard/warranties", icon: BadgeCheck, permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"] },
];

const CATALOG_NAV_ITEMS: NavItem[] = [
  { title: "Products", href: "/dashboard/products", icon: Package, permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"] },
  { title: "Inventory", href: "/dashboard/inventory", icon: Warehouse, permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE"] },
  { title: "Brands", href: "/dashboard/brands", icon: Tags, permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"] },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid, permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"] },
  { title: "Models", href: "/dashboard/models", icon: Smartphone, permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE"] },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Users", href: "/dashboard/users", icon: UserCog, permissions: ["USER_VIEW", "USER_MANAGE"] },
  { title: "Roles", href: "/dashboard/roles", icon: ShieldCheck, permissions: ["ROLE_MANAGE"] },
  { title: "Employees", href: "/dashboard/employees", icon: Contact, permissions: ["EMPLOYEE_VIEW", "EMPLOYEE_MANAGE"] },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, permissions: ["SETTINGS_VIEW", "SETTINGS_MANAGE"] },
  { title: "Audit Log", href: "/dashboard/audit-logs", icon: History, permissions: ["AUDIT_VIEW"] },
];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Menu", items: MAIN_NAV_ITEMS },
  { label: "Transactions", items: TRANSACTION_NAV_ITEMS },
  { label: "Service", items: SERVICE_NAV_ITEMS },
  { label: "Insights", items: INSIGHTS_NAV_ITEMS },
  { label: "Catalog", items: CATALOG_NAV_ITEMS },
  { label: "Administration", items: ADMIN_NAV_ITEMS },
];

export function AppSidebar() {
  const { data: user } = useCurrentUser();
  // Until the user loads, show nothing gated (avoids a flash of every link
  // followed by most of them disappearing) — just the always-visible ones.
  const permissions = user?.permissions ?? [];

  // Every role can read Settings (GET has no permission gate — see
  // setting.routes.ts) since shop name/logo are branding, not sensitive
  // data every sidebar needs regardless of role.
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings, staleTime: 60_000 });

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permissions || item.permissions.some((p) => permissions.includes(p))),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {settings?.shop_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset
                  <img src={settings.shop_logo} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-4" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">{settings?.shop_name || "Mobile Shop POS"}</span>
                <span className="text-xs text-muted-foreground">Point of Sale</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton tooltip={item.title} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
