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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/stat-tile";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchDashboardSummary } from "@/lib/api/dashboard";

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

export default function DashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
    refetchInterval: 60_000,
  });

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
          <StatTile label="Today's Sales" value={summary.todaySales} icon={Wallet} />
          <StatTile label="Today's Purchases" value={summary.todayPurchases} icon={Truck} />
          <StatTile label="Monthly Sales" value={summary.monthlySales} icon={TrendingUp} />
          <StatTile label="Total Revenue" value={summary.totalRevenue} icon={BadgeDollarSign} />
          <StatTile label="Total Products" value={summary.totalProducts} icon={Package} />
          <StatTile label="Total Customers" value={summary.totalCustomers} icon={Users} />
          <StatTile label="Total Suppliers" value={summary.totalSuppliers} icon={Building2} />
          <StatTile
            label="Low Stock"
            value={summary.lowStockProducts}
            icon={AlertTriangle}
            tone={summary.lowStockProducts > 0 ? "warning" : "default"}
          />
          <StatTile
            label="Out of Stock"
            value={summary.outOfStockProducts}
            icon={PackageX}
            tone={summary.outOfStockProducts > 0 ? "critical" : "default"}
          />
          <StatTile
            label="Pending Payments"
            value={summary.pendingPayments}
            icon={Clock}
            tone={summary.pendingPayments > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
