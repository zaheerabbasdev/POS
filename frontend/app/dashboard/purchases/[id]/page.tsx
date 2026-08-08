"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPurchase } from "@/lib/api/purchases";
import { PurchaseReturnDialog } from "./purchase-return-dialog";
import { PurchaseEditDialog } from "./purchase-edit-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  PENDING: "destructive",
};

export default function PurchaseDetailPage(props: PageProps<"/dashboard/purchases/[id]">) {
  const { id } = use(props.params);
  const [returnOpen, setReturnOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: purchase, isLoading } = useQuery({
    queryKey: ["purchases", id],
    queryFn: () => fetchPurchase(id),
  });

  if (isLoading || !purchase) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase {purchase.invoiceNo}</h1>
          <p className="text-muted-foreground">
            {purchase.supplier.name} · {new Date(purchase.purchaseDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[purchase.status] ?? "outline"}>{purchase.status}</Badge>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="outline" onClick={() => setReturnOpen(true)}>
            Return Items
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
                <TableHead>IMEIs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.purchasePrice}</TableCell>
                  <TableCell className="text-right">{item.lineTotal}</TableCell>
                  <TableCell className="font-mono text-xs">{item.imeis.join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{purchase.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{purchase.discount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{purchase.tax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{purchase.shippingCost}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1.5 font-medium">
              <span>Total</span>
              <span>{purchase.totalAmount}</span>
            </div>
            {purchase.remarks ? (
              <div className="mt-1 border-t pt-1.5">
                <span className="text-muted-foreground">Remarks</span>
                <p>{purchase.remarks}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {purchase.payments.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {purchase.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {payment.method} · {new Date(payment.date).toLocaleDateString()}
                    </span>
                    <span>{payment.amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <PurchaseReturnDialog open={returnOpen} onOpenChange={setReturnOpen} purchase={purchase} />
      <PurchaseEditDialog open={editOpen} onOpenChange={setEditOpen} purchase={purchase} />
    </div>
  );
}
