"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRepair } from "@/lib/api/repairs";
import { fetchSettings } from "@/lib/api/settings";
import { REPAIR_STATUS_ITEMS } from "@/lib/select-items";

/** "Print Repair Receipt" (SRS Module 19) — standalone, chrome-free, same pattern as /print/sales/[id]. */
export default function PrintRepairPage(props: PageProps<"/print/repairs/[id]">) {
  const { id } = use(props.params);

  const { data: repair, isLoading } = useQuery({ queryKey: ["repairs", id], queryFn: () => fetchRepair(id) });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  if (isLoading || !repair) {
    return <div className="p-8 text-center text-muted-foreground">Loading receipt...</div>;
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
          <h2 className="text-lg font-semibold">REPAIR RECEIPT</h2>
          <p className="font-mono text-sm">{repair.repairTicketNumber}</p>
          <p className="text-sm text-muted-foreground">{new Date(repair.receivedDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Customer</p>
          <p>{repair.customer}</p>
          {repair.customerPhone ? <p className="text-muted-foreground">{repair.customerPhone}</p> : null}
        </div>
        <div className="text-right">
          <p className="font-medium">Status</p>
          <p>{REPAIR_STATUS_ITEMS[repair.status]}</p>
        </div>
        <div>
          <p className="font-medium">Device</p>
          <p>{repair.device ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="font-medium">IMEI</p>
          <p className="font-mono">{repair.imei ?? "—"}</p>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-medium">Problem Reported</p>
        <p className="text-muted-foreground">{repair.problemDescription}</p>
      </div>

      {repair.diagnosis ? (
        <div className="mt-3 text-sm">
          <p className="font-medium">Diagnosis</p>
          <p className="text-muted-foreground">{repair.diagnosis}</p>
        </div>
      ) : null}

      {repair.items.length > 0 ? (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Part</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {repair.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{item.unitPrice}</td>
                <td className="py-2 text-right">{item.totalPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div className="ml-auto mt-4 flex w-56 flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimated Cost</span>
          <span>{repair.estimatedCost}</span>
        </div>
        <div className="flex justify-between border-t pt-1 font-semibold">
          <span>Actual Cost</span>
          <span>{repair.actualCost}</span>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">Please bring this receipt when collecting your device.</p>
    </div>
  );
}
