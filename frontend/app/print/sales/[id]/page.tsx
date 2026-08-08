"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSale } from "@/lib/api/sales";
import { fetchSettings } from "@/lib/api/settings";

/**
 * A standalone, chrome-free invoice view — API Spec's "Generate Invoices"
 * (Sales/POS module). Deliberately its own route outside /dashboard rather
 * than a modal on the sale detail page, so the sidebar/header never end up
 * in the printed output (@media print below only has to hide the one
 * button on this page, not fight the whole dashboard layout).
 */
export default function PrintSalePage(props: PageProps<"/print/sales/[id]">) {
  const { id } = use(props.params);

  const { data: sale, isLoading } = useQuery({ queryKey: ["sales", id], queryFn: () => fetchSale(id) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  if (isLoading || !sale) {
    return <div className="p-8 text-center text-muted-foreground">Loading invoice...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-8 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>

      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{settings?.shop_name || "Mobile Shop POS"}</h1>
          {settings?.shop_address ? <p className="text-sm text-muted-foreground">{settings.shop_address}</p> : null}
          {settings?.shop_phone ? <p className="text-sm text-muted-foreground">{settings.shop_phone}</p> : null}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold">INVOICE</h2>
          <p className="font-mono text-sm">{sale.invoiceNumber}</p>
          <p className="text-sm text-muted-foreground">{new Date(sale.saleDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-4 flex justify-between text-sm">
        <div>
          <p className="font-medium">Bill To</p>
          <p>{sale.customer?.name ?? "Walk-in Customer"}</p>
          {sale.customer?.phone ? <p className="text-muted-foreground">{sale.customer.phone}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-medium">Cashier</p>
          <p>{sale.cashier ?? "—"}</p>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="py-2">
                {item.name}
                {item.imei ? <span className="block font-mono text-xs text-muted-foreground">IMEI: {item.imei}</span> : null}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{item.price}</td>
              <td className="py-2 text-right">{item.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto mt-4 flex w-56 flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{sale.subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>-{sale.discount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{sale.tax}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Total</span>
          <span>{sale.totalAmount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span>{sale.paidAmount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Due</span>
          <span>{sale.dueAmount}</span>
        </div>
      </div>

      {sale.isCancelled ? (
        <p className="mt-6 text-center text-sm font-semibold text-destructive">THIS SALE WAS CANCELLED</p>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted-foreground">Thank you for your business.</p>
    </div>
  );
}
