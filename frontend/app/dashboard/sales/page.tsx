"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSales } from "@/lib/api/sales";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "destructive",
};

export default function SalesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => fetchSales({ limit: 50 }),
  });

  const filtered = search
    ? data?.data.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          s.customer.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Sales history and invoices.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/pos" />}>
          <Plus /> New Sale
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice # or customer..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs">{sale.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{sale.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.cashier ?? "—"}</TableCell>
                    <TableCell className="text-right">{sale.totalAmount}</TableCell>
                    <TableCell className="flex gap-1">
                      <Badge variant={STATUS_VARIANT[sale.status] ?? "outline"}>{sale.status}</Badge>
                      {sale.isCancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/dashboard/sales/${sale.id}`} />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No sales found.
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
