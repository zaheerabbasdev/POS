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
import { fetchPurchases } from "@/lib/api/purchases";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  PENDING: "destructive",
};

export default function PurchasesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => fetchPurchases({ limit: 50 }),
  });

  const filtered = search
    ? data?.data.filter(
        (p) => p.invoiceNo.toLowerCase().includes(search.toLowerCase()) || p.supplier.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">Supplier purchases, stock increases, and purchase invoices.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/purchases/new" />}>
          <Plus /> New Purchase
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice # or supplier..."
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
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-xs">{purchase.invoiceNo}</TableCell>
                    <TableCell className="font-medium">{purchase.supplier}</TableCell>
                    <TableCell className="text-right">{purchase.totalAmount}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[purchase.status] ?? "outline"}>{purchase.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/dashboard/purchases/${purchase.id}`} />}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No purchases found.
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
