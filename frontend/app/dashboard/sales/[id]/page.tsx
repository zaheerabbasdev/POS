"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchSale, cancelSale } from "@/lib/api/sales";
import { createPayment } from "@/lib/api/payments";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";
import { SalesReturnDialog } from "./sales-return-dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  PAID: "default",
  PARTIAL: "secondary",
  UNPAID: "destructive",
};

export default function SaleDetailPage(props: PageProps<"/dashboard/sales/[id]">) {
  const { id } = use(props.params);
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data: sale, isLoading } = useQuery({
    queryKey: ["sales", id],
    queryFn: () => fetchSale(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(id, "Cancelled from sale detail screen"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", id] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Sale cancelled.");
      setCancelOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: () => createPayment({ type: "customer", referenceId: id, amount: Number(paymentAmount), method: paymentMethod }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sales", id] });
      toast.success("Payment recorded.");
      setPaymentAmount("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !sale) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice {sale.invoiceNumber}</h1>
          <p className="text-muted-foreground">
            {sale.customer?.name ?? "Walk-in customer"} · {new Date(sale.saleDate).toLocaleDateString()} · Cashier:{" "}
            {sale.cashier ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[sale.status] ?? "outline"}>{sale.status}</Badge>
          {sale.isCancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
          {!sale.isCancelled ? (
            <Button variant="outline" onClick={() => setReturnOpen(true)}>
              Return Items
            </Button>
          ) : null}
          {!sale.isCancelled ? (
            <Button variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
              Cancel Sale
            </Button>
          ) : null}
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
                <TableHead>IMEI</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
                <TableHead>Warranty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.imei ?? "—"}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{item.price}</TableCell>
                  <TableCell className="text-right">{item.lineTotal}</TableCell>
                  <TableCell>
                    {item.warranty ? (
                      <Badge variant={item.warranty.status === "ACTIVE" ? "secondary" : "outline"}>
                        {item.warranty.periodMonths}mo — {item.warranty.status}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{sale.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{sale.discount}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{sale.totalAmount}</span>
            </div>
            <div className="mt-1 flex justify-between border-t pt-1.5">
              <span className="text-muted-foreground">Paid</span>
              <span>{sale.paidAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due</span>
              <span className={Number(sale.dueAmount) > 0 ? "text-destructive" : ""}>{sale.dueAmount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {sale.payments.length > 0 ? (
              <ul className="flex flex-col gap-2 text-sm">
                {sale.payments.map((payment) => (
                  <li key={payment.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {payment.type} · {payment.method} · {new Date(payment.date).toLocaleDateString()}
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

        {!sale.isCancelled && Number(sale.dueAmount) > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")} items={PAYMENT_METHOD_ITEMS}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                inputMode="decimal"
                placeholder={`Up to ${sale.dueAmount}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <Button
                disabled={!paymentAmount || paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
              >
                {paymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this sale?"
        description="Inventory will be restored, IMEIs freed, and any warranty cancelled. Paid amounts are refunded as a record — nothing is deleted."
        confirmLabel="Cancel Sale"
        isPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <SalesReturnDialog open={returnOpen} onOpenChange={setReturnOpen} sale={sale} />
    </div>
  );
}
