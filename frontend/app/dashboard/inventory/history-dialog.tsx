"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchStockHistory, type InventoryItem } from "@/lib/api/inventory";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem;
}

export function HistoryDialog({ open, onOpenChange, item }: HistoryDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["stock-history", item?.productId],
    queryFn: () => fetchStockHistory(item!.productId),
    enabled: open && Boolean(item),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stock movement history</DialogTitle>
          <DialogDescription>{item?.name}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.length > 0 ? (
                data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.type}</Badge>
                    </TableCell>
                    <TableCell className={`text-right ${entry.quantity < 0 ? "text-destructive" : "text-primary"}`}>
                      {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.remarks ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(entry.createdAt), "MMM d, yyyy p")}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No stock movements yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
