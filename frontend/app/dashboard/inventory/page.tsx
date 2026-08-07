"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchInventory, type InventoryItem } from "@/lib/api/inventory";
import { STOCK_STATUS_ITEMS } from "@/lib/select-items";
import { AdjustmentDialog } from "./adjustment-dialog";
import { HistoryDialog } from "./history-dialog";

const STOCK_STATUS_LABEL: Record<InventoryItem["stockStatus"], { label: string; variant: "default" | "secondary" | "destructive" }> = {
  in_stock: { label: "In stock", variant: "default" },
  low_stock: { label: "Low stock", variant: "secondary" },
  out_of_stock: { label: "Out of stock", variant: "destructive" },
};

export default function InventoryPage() {
  const [stockStatus, setStockStatus] = useState<InventoryItem["stockStatus"] | "">("");
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | undefined>(undefined);
  const [historyItem, setHistoryItem] = useState<InventoryItem | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", { stockStatus }],
    queryFn: () => fetchInventory({ stockStatus: stockStatus || undefined, limit: 50 }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Track stock levels and record manual adjustments.</p>
      </div>

      <Select
        items={STOCK_STATUS_ITEMS}
        value={stockStatus || "all"}
        onValueChange={(v) => setStockStatus(!v || v === "all" ? "" : (v as InventoryItem["stockStatus"]))}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All stock levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stock levels</SelectItem>
          <SelectItem value="in_stock">In stock</SelectItem>
          <SelectItem value="low_stock">Low stock</SelectItem>
          <SelectItem value="out_of_stock">Out of stock</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.availableQuantity}</TableCell>
                    <TableCell className="text-right">{item.reorderLevel}</TableCell>
                    <TableCell>
                      <Badge variant={STOCK_STATUS_LABEL[item.stockStatus].variant}>
                        {STOCK_STATUS_LABEL[item.stockStatus].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryItem(item)}>
                        History
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setAdjustingItem(item)}>
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdjustmentDialog open={Boolean(adjustingItem)} onOpenChange={(open) => !open && setAdjustingItem(undefined)} item={adjustingItem} />
      <HistoryDialog open={Boolean(historyItem)} onOpenChange={(open) => !open && setHistoryItem(undefined)} item={historyItem} />
    </div>
  );
}
