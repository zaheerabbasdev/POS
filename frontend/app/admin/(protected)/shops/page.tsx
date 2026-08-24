"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { RequirePermission } from "@/components/require-permission";
import { fetchShops, type ShopStatus } from "@/lib/api/shops";

const PAGE_SIZE = 20;
const STATUS_ITEMS: Record<"all" | ShopStatus, string> = {
  all: "All statuses",
  TRIAL: "Trial",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
};

function AdminShopsPageContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | ShopStatus>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shops", { search, status, page }],
    queryFn: () =>
      fetchShops({
        search: search || undefined,
        ...(status !== "all" ? { status } : {}),
        page,
        limit: PAGE_SIZE,
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shops</h1>
          <p className="text-muted-foreground">Every shop on the platform, its owner, plan, and trial status.</p>
        </div>
        <Button render={<Link href="/admin/shops/new" />}>
          <Plus /> Create Shop
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by shop or owner name..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(value) => {
            setStatus((value as "all" | ShopStatus | null) ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial ends</TableHead>
                <TableHead>Days remaining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.ownerName ?? "—"}</TableCell>
                    <TableCell>{shop.planName ?? "—"}</TableCell>
                    <TableCell>
                      <ShopStatusBadge status={shop.status} />
                    </TableCell>
                    <TableCell>{shop.trialEndDate ? new Date(shop.trialEndDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{shop.daysRemaining ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" render={<Link href={`/admin/shops/${shop.id}`} />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No shops found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data ? (
        <PaginationControls
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

export default function AdminShopsPage() {
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_VIEW"]}>
      <AdminShopsPageContent />
    </RequirePermission>
  );
}
