"use client";

import Link from "next/link";
import { LayoutDashboard, Store, ShieldCheck, CreditCard } from "lucide-react";
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

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// Deliberately separate from components/layout/app-sidebar.tsx (spec §56 —
// Platform Admin navigation is never mixed with shop POS navigation). Grows
// one entry at a time as more of the admin panel gets built (Subscriptions,
// Users, Reports, Audit Logs, Settings).
const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Shops", href: "/admin/shops", icon: Store },
  { title: "Subscription Plans", href: "/admin/subscription-plans", icon: CreditCard },
];

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/admin" />}>
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-medium">Platform Admin</span>
                <span className="text-xs text-muted-foreground">Mobile Shop POS</span>
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
              {NAV_ITEMS.map((item) => (
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
