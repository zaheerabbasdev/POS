"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchPurchases, type PurchaseListItem } from "@/lib/api/purchases";

interface PickPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (purchase: PurchaseListItem) => void;
}

/**
 * Step 1 of "+ New Return" from the Purchase Returns page — find the
 * original purchase before the actual PurchaseReturnDialog (which needs
 * full line-item detail) can open. Same client-side-filtered-batch pattern
 * as the Sales Returns picker — the backend's /purchases list endpoint has
 * no text-search param at all, only supplierId/status.
 */
export function PickPurchaseDialog({ open, onOpenChange, onPicked }: PickPurchaseDialogProps) {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["purchases", "return-picker"],
    queryFn: () => fetchPurchases({ limit: 100 }),
    enabled: open,
  });

  const filtered = query
    ? data?.data.filter(
        (p) =>
          p.invoiceNo.toLowerCase().includes(query.toLowerCase()) || p.supplier.toLowerCase().includes(query.toLowerCase()),
      )
    : data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Return</DialogTitle>
          <DialogDescription>Find the original purchase by purchase number or supplier name.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Purchase # or supplier..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered && filtered.length > 0 ? (
            filtered.map((purchase) => (
              <button
                key={purchase.id}
                type="button"
                className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                onClick={() => onPicked(purchase)}
              >
                <span className="flex flex-col">
                  <span className="font-mono text-xs">{purchase.invoiceNo}</span>
                  <span className="font-medium">{purchase.supplier}</span>
                </span>
                <span>{purchase.totalAmount}</span>
              </button>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-muted-foreground">No matching purchases.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
