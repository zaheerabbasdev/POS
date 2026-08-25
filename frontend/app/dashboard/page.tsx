"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Truck,
  TrendingUp,
  BadgeDollarSign,
  Users,
  Building2,
  Package,
  AlertTriangle,
  PackageX,
  Clock,
  Wrench,
  CheckCircle2,
  BadgeCheck,
  AlarmClockCheck,
  Banknote,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/stat-tile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchDashboardSummary, type DashboardSummary } from "@/lib/api/dashboard";

const SALE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "destructive",
};

const PURCHASE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  PENDING: "destructive",
};

interface TileDef {
  label: string;
  icon: LucideIcon;
  value: (s: DashboardSummary) => string | number;
  tone?: (s: DashboardSummary) => "default" | "warning" | "critical";
  /** Any one of these grants visibility — same any-of rule as the sidebar/backend requirePermission(...). */
  permissions: string[];
}

// Every tile is gated by permission, not role name — a custom role edited at
// runtime gets exactly the tiles its permissions unlock, the same rule the
// sidebar already follows. This is why e.g. Technician (REPAIR_*/WARRANTY_*
// only) never used to see Sales/Purchases tiles it can't act on, and why
// Accountant now gets financial tiles instead of an empty-feeling dashboard.
const TILES: TileDef[] = [
  { label: "Today's Sales", icon: Wallet, value: (s) => s.todaySales, permissions: ["SALE_VIEW", "SALE_CREATE"] },
  { label: "Today's Purchases", icon: Truck, value: (s) => s.todayPurchases, permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE"] },
  { label: "Monthly Sales", icon: TrendingUp, value: (s) => s.monthlySales, permissions: ["SALE_VIEW", "SALE_CREATE"] },
  {
    label: "Total Revenue",
    icon: BadgeDollarSign,
    value: (s) => s.totalRevenue,
    permissions: ["SALE_VIEW", "SALE_CREATE", "REPORT_VIEW"],
  },
  {
    label: "Total Products",
    icon: Package,
    value: (s) => s.totalProducts,
    permissions: ["PRODUCT_VIEW", "PRODUCT_MANAGE", "INVENTORY_VIEW", "INVENTORY_MANAGE"],
  },
  { label: "Total Customers", icon: Users, value: (s) => s.totalCustomers, permissions: ["CUSTOMER_VIEW", "CUSTOMER_MANAGE"] },
  { label: "Total Suppliers", icon: Building2, value: (s) => s.totalSuppliers, permissions: ["SUPPLIER_VIEW", "SUPPLIER_MANAGE"] },
  {
    label: "Low Stock",
    icon: AlertTriangle,
    value: (s) => s.lowStockProducts,
    tone: (s) => (s.lowStockProducts > 0 ? "warning" : "default"),
    permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE", "PRODUCT_VIEW", "PRODUCT_MANAGE"],
  },
  {
    label: "Out of Stock",
    icon: PackageX,
    value: (s) => s.outOfStockProducts,
    tone: (s) => (s.outOfStockProducts > 0 ? "critical" : "default"),
    permissions: ["INVENTORY_VIEW", "INVENTORY_MANAGE", "PRODUCT_VIEW", "PRODUCT_MANAGE"],
  },
  {
    label: "Pending Payments",
    icon: Clock,
    value: (s) => s.pendingPayments,
    tone: (s) => (s.pendingPayments > 0 ? "warning" : "default"),
    permissions: ["PAYMENT_VIEW", "PAYMENT_MANAGE", "SALE_VIEW", "SALE_CREATE"],
  },
  {
    label: "Payments This Month",
    icon: CreditCard,
    value: (s) => s.monthlyPayments,
    permissions: ["PAYMENT_VIEW", "PAYMENT_MANAGE"],
  },
  {
    label: "Open Cash Drawers",
    icon: Wallet,
    value: (s) => s.openCashDrawers,
    permissions: ["CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"],
  },
  {
    label: "Pending Repairs",
    icon: Wrench,
    value: (s) => s.pendingRepairs,
    tone: (s) => (s.pendingRepairs > 0 ? "warning" : "default"),
    permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"],
  },
  { label: "Completed Repairs", icon: CheckCircle2, value: (s) => s.completedRepairs, permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"] },
  { label: "Total Repairs", icon: Wrench, value: (s) => s.totalRepairs, permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"] },
  { label: "Customers Served", icon: Users, value: (s) => s.customersServed, permissions: ["REPAIR_VIEW", "REPAIR_MANAGE"] },
  { label: "Active Warranties", icon: BadgeCheck, value: (s) => s.activeWarranties, permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"] },
  {
    label: "Expiring Warranties (30d)",
    icon: AlarmClockCheck,
    value: (s) => s.expiringWarranties,
    tone: (s) => (s.expiringWarranties > 0 ? "warning" : "default"),
    permissions: ["WARRANTY_VIEW", "WARRANTY_MANAGE"],
  },
  {
    label: "Monthly Expenses",
    icon: Banknote,
    value: (s) => s.monthlyExpenses,
    permissions: ["EXPENSE_VIEW", "EXPENSE_MANAGE"],
  },
];

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

  const permissions = user?.permissions ?? [];
  const has = (perms: string[]) => perms.some((p) => permissions.includes(p));
  const visibleTiles = TILES.filter((tile) => has(tile.permissions));

  const showRecentSales = has(["SALE_VIEW", "SALE_CREATE"]);
  const showRecentPurchases = has(["PURCHASE_VIEW", "PURCHASE_CREATE"]);
  const showRecentRepairs = has(["REPAIR_VIEW", "REPAIR_MANAGE"]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user ? `Welcome, ${user.name}` : <Skeleton className="h-8 w-64" />}
        </h1>
        <p className="text-muted-foreground">Your business today, at a glance.</p>
      </div>

      {isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {visibleTiles.map((tile) => (
            <StatTile
              key={tile.label}
              label={tile.label}
              value={tile.value(summary)}
              icon={tile.icon}
              tone={tile.tone?.(summary) ?? "default"}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {showRecentSales ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : summary && summary.recentSales.length > 0 ? (
                    summary.recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <Link href={`/dashboard/sales/${sale.id}`} className="font-mono text-xs hover:underline">
                            {sale.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{sale.customer}</TableCell>
                        <TableCell className="text-right">{sale.totalAmount}</TableCell>
                        <TableCell>
                          <Badge variant={SALE_STATUS_VARIANT[sale.status] ?? "outline"}>{sale.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        No sales yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {showRecentPurchases ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : summary && summary.recentPurchases.length > 0 ? (
                    summary.recentPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <Link href={`/dashboard/purchases/${purchase.id}`} className="font-mono text-xs hover:underline">
                            {purchase.purchaseNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{purchase.supplier}</TableCell>
                        <TableCell className="text-right">{purchase.totalAmount}</TableCell>
                        <TableCell>
                          <Badge variant={PURCHASE_STATUS_VARIANT[purchase.status] ?? "outline"}>{purchase.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        No purchases yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {showRecentRepairs ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Repairs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : summary && summary.recentRepairs.length > 0 ? (
                    summary.recentRepairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell>
                          <Link href={`/dashboard/repairs/${repair.id}`} className="font-mono text-xs hover:underline">
                            {repair.repairTicketNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{repair.customer}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{repair.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                        No repairs yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
