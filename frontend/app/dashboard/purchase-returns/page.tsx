"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchPurchaseReturns } from "@/lib/api/purchase-returns";
import { fetchPurchase, type PurchaseDetail, type PurchaseListItem } from "@/lib/api/purchases";
import { getApiErrorMessage } from "@/lib/api-client";
import { PurchaseReturnDialog } from "../purchases/[id]/purchase-return-dialog";
import { PickPurchaseDialog } from "./pick-purchase-dialog";

const PAGE_SIZE = 50;

/** Return-to-supplier history — same gap as Sales Returns had: create path existed, no browse/search page until now. */
export default function PurchaseReturnsPage() {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // "+ New Return" — pick the original purchase first (it needs full
  // line-item detail, which the list row doesn't have), then hand off to
  // the same PurchaseReturnDialog the purchase detail page already uses.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDetail | null>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);

  const handlePicked = async (item: PurchaseListItem) => {
    setIsLoadingPurchase(true);
    try {
      const detail = await fetchPurchase(item.id);
      setSelectedPurchase(detail);
      setPickerOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsLoadingPurchase(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-returns", { startDate, endDate, page }],
    queryFn: () =>
      fetchPurchaseReturns({ startDate: startDate || undefined, endDate: endDate || undefined, page, limit: PAGE_SIZE }),
  });

  const filtered = search
    ? data?.data.filter(
        (r) =>
          r.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
          r.supplier.toLowerCase().includes(search.toLowerCase()),
      )
    : data?.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Returns</h1>
          <p className="text-muted-foreground">Every item sent back to a supplier, and the credit it created.</p>
        </div>
        <Button onClick={() => setPickerOpen(true)} disabled={isLoadingPurchase}>
          <Plus /> {isLoadingPurchase ? "Loading purchase..." : "New Return"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search this page by purchase # or supplier..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preturn-start-date" className="text-xs text-muted-foreground">
            From
          </label>
          <Input
            id="preturn-start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preturn-end-date" className="text-xs text-muted-foreground">
            To
          </label>
          <Input
            id="preturn-end-date"
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
                <TableHead>Purchase #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items Returned</TableHead>
                <TableHead className="text-right">Credit</TableHead>
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
                    <TableCell className="font-mono text-xs">{r.purchaseNumber}</TableCell>
                    <TableCell className="font-medium">{r.supplier}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.returnDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{r.returnAmount}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground" title={r.reason ?? undefined}>
                      {r.reason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/dashboard/purchases/${r.purchaseId}`} />}
                      >
                        View Purchase
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

      <PickPurchaseDialog open={pickerOpen} onOpenChange={setPickerOpen} onPicked={(item) => void handlePicked(item)} />
      {selectedPurchase ? (
        <PurchaseReturnDialog
          open={Boolean(selectedPurchase)}
          onOpenChange={(open) => !open && setSelectedPurchase(null)}
          purchase={selectedPurchase}
        />
      ) : null}
    </div>
  );
}
