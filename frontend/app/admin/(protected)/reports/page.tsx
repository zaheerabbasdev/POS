"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { RequirePermission } from "@/components/require-permission";
import { fetchShopsPerformance, fetchSubscriptionOverview } from "@/lib/api/admin-reports";

function AdminReportsPageContent() {
  const { data: shopRows, isLoading: shopsLoading } = useQuery({
    queryKey: ["admin", "reports", "shops-performance"],
    queryFn: fetchShopsPerformance,
  });

  const { data: planRows, isLoading: plansLoading } = useQuery({
    queryKey: ["admin", "reports", "subscription-overview"],
    queryFn: fetchSubscriptionOverview,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Performance across every shop on the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop Performance</CardTitle>
          <CardDescription>Lifetime sales and purchase totals per shop.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : shopRows && shopRows.length > 0 ? (
                shopRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.ownerName ?? "—"}</TableCell>
                    <TableCell>{row.planName ?? "—"}</TableCell>
                    <TableCell>
                      <ShopStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">{row.totalSales}</TableCell>
                    <TableCell className="text-right">{row.totalPurchases}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No shops yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Overview</CardTitle>
          <CardDescription>How shops are distributed across plans, and lifetime revenue per plan.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Shops on Plan</TableHead>
                <TableHead className="text-right">Lifetime Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : planRows && planRows.length > 0 ? (
                planRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>
                      {row.isTrial ? <Badge variant="outline">Trial</Badge> : <Badge variant="secondary">Paid</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.shopsCurrentlyOnPlan}</TableCell>
                    <TableCell className="text-right">
                      {row.currency} {row.lifetimeRevenue}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No plans yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <RequirePermission permissions={["PLATFORM_REPORT_VIEW"]}>
      <AdminReportsPageContent />
    </RequirePermission>
  );
}
