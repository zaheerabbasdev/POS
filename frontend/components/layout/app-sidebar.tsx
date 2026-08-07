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

// Grows one entry at a time as each module gets a frontend page.
const MAIN_NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "New Sale (POS)", href: "/dashboard/pos", icon: ShoppingCart },
];

const TRANSACTION_NAV_ITEMS = [
  { title: "Sales", href: "/dashboard/sales", icon: ReceiptText },
  { title: "Purchases", href: "/dashboard/purchases", icon: ClipboardList },
  { title: "Cash Drawer", href: "/dashboard/cash-drawer", icon: Wallet },
  { title: "Expenses", href: "/dashboard/expenses", icon: Banknote },
  { title: "Customers", href: "/dashboard/customers", icon: Users },
  { title: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
];

const INSIGHTS_NAV_ITEMS = [{ title: "Reports", href: "/dashboard/reports", icon: BarChart3 }];

const SERVICE_NAV_ITEMS = [
  { title: "Repairs", href: "/dashboard/repairs", icon: Wrench },
  { title: "Warranties", href: "/dashboard/warranties", icon: BadgeCheck },
];

const CATALOG_NAV_ITEMS = [
  { title: "Products", href: "/dashboard/products", icon: Package },
  { title: "Inventory", href: "/dashboard/inventory", icon: Warehouse },
  { title: "Brands", href: "/dashboard/brands", icon: Tags },
  { title: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
  { title: "Models", href: "/dashboard/models", icon: Smartphone },
];

const ADMIN_NAV_ITEMS = [
  { title: "Users", href: "/dashboard/users", icon: UserCog },
  { title: "Roles", href: "/dashboard/roles", icon: ShieldCheck },
  { title: "Employees", href: "/dashboard/employees", icon: Contact },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Store className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Mobile Shop POS</span>
                <span className="text-xs text-muted-foreground">Point of Sale</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV_ITEMS.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Transactions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TRANSACTION_NAV_ITEMS.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Service</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SERVICE_NAV_ITEMS.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {INSIGHTS_NAV_ITEMS.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Catalog</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CATALOG_NAV_ITEMS.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
