"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchSalesReturns } from "@/lib/api/sales-returns";

const PAGE_SIZE = 50;

/** Return history — DDD Chapter 35's "Return Workflow" had a create path but no browse/search page until now. */
export default function SalesReturnsPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["sales-returns", { startDate, endDate, page }],
    queryFn: () =>
      fetchSalesReturns({ startDate: startDate || undefined, endDate: endDate || undefined, page, limit: PAGE_SIZE }),
  });

  const filtered = search
    ? data?.data.filter(
        (r) =>
          r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.customer.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sales Returns</h1>
        <p className="text-muted-foreground">Every item a customer has returned, with the refund it triggered.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search this page by invoice # or customer..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-start-date" className="text-xs text-muted-foreground">
            From
          </label>
          <Input
            id="return-start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-end-date" className="text-xs text-muted-foreground">
            To
          </label>
          <Input
            id="return-end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items Returned</TableHead>
                <TableHead className="text-right">Refund</TableHead>
                <TableHead>Reason</TableHead>
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
              ) : filtered && filtered.length > 0 ? (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{r.customer}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{r.refundAmount}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground" title={r.returnReason ?? undefined}>
                      {r.returnReason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/dashboard/sales/${r.saleId}`} />}>
                        View Sale
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No returns found.
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
