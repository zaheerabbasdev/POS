"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchSales, type SaleListItem } from "@/lib/api/sales";

interface PickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (sale: SaleListItem) => void;
}

/**
 * Step 1 of "+ New Return" from the Sales Returns page — find the original
 * sale before the actual SalesReturnDialog (which needs full line-item
 * detail) can open. Fetches a batch of recent sales and filters client-side
 * by invoice #/customer, same pattern as the Sales list page's own search —
 * the backend's /sales list endpoint only supports an exact-ish invoiceNumber
 * filter, not a combined invoice-or-customer search.
 */
export function PickSaleDialog({ open, onOpenChange, onPicked }: PickSaleDialogProps) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales", "return-picker"],
    queryFn: () => fetchSales({ limit: 100 }),
    enabled: open,
  });

  const filtered = query
    ? data?.data.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
          s.customer.toLowerCase().includes(query.toLowerCase()),
      )
    : data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Return</DialogTitle>
          <DialogDescription>Find the original sale by invoice number or customer name.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Invoice # or customer..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered && filtered.length > 0 ? (
            filtered.map((sale) => (
              <button
                key={sale.id}
                type="button"
                className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                onClick={() => onPicked(sale)}
              >
                <span className="flex flex-col">
                  <span className="font-mono text-xs">{sale.invoiceNumber}</span>
                  <span className="font-medium">{sale.customer}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span>{sale.totalAmount}</span>
                  {sale.isCancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
                </span>
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No matching sales.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
