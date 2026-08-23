"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Store, CheckCircle2, Hourglass, AlarmClockCheck, XCircle, Ban, Users, BadgeDollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/stat-tile";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { fetchPlatformDashboardSummary } from "@/lib/api/admin-dashboard";

export default function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: fetchPlatformDashboardSummary,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {user ? `Welcome, ${user.name}` : <Skeleton className="h-8 w-64" />}
        </h1>
        <p className="text-muted-foreground">Platform health, at a glance.</p>
      </div>

      {isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Total Shops" value={summary.totalShops} icon={Store} />
          <StatTile label="Active Shops" value={summary.activeShops} icon={CheckCircle2} />
          <StatTile label="Trial Shops" value={summary.trialShops} icon={Hourglass} />
          <StatTile
            label="Expiring Trials (7d)"
            value={summary.expiringTrials}
            icon={AlarmClockCheck}
            tone={summary.expiringTrials > 0 ? "warning" : "default"}
          />
          <StatTile
            label="Expired Shops"
            value={summary.expiredShops}
            icon={XCircle}
            tone={summary.expiredShops > 0 ? "critical" : "default"}
          />
          <StatTile
            label="Suspended Shops"
            value={summary.suspendedShops}
            icon={Ban}
            tone={summary.suspendedShops > 0 ? "critical" : "default"}
          />
          <StatTile label="Total Users" value={summary.totalUsers} icon={Users} />
          <StatTile label="New Subs Revenue (Month)" value={summary.newSubscriptionRevenueThisMonth} icon={BadgeDollarSign} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Shops</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : summary && summary.recentShops.length > 0 ? (
                summary.recentShops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell>
                      <Link href={`/admin/shops/${shop.id}`} className="font-medium hover:underline">
                        {shop.name}
                      </Link>
                    </TableCell>
                    <TableCell>{shop.ownerName ?? "—"}</TableCell>
                    <TableCell>
                      <ShopStatusBadge status={shop.status} />
                    </TableCell>
                    <TableCell>{new Date(shop.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No shops yet.
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
