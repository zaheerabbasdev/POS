"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ShopStatusBadge } from "@/components/shop-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RequirePermission } from "@/components/require-permission";
import { fetchShop, suspendShop, activateShop, extendTrial } from "@/lib/api/shops";
import { getApiErrorMessage } from "@/lib/api-client";

const DAY_PRESETS = [7, 15, 30];

function ExtendTrialDialog({
  shopId,
  open,
  onOpenChange,
}: {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState("");
  const [reason, setReason] = useState("");

  const effectiveDays = customDays ? Number(customDays) : days;

  const mutation = useMutation({
    mutationFn: () => extendTrial(shopId, { days: effectiveDays, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops", shopId] });
      toast.success(`Trial extended by ${effectiveDays} day(s).`);
      onOpenChange(false);
      setReason("");
      setCustomDays("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend free trial</DialogTitle>
          <DialogDescription>Adds days to the current trial (or starts fresh from today if it already expired).</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {DAY_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={!customDays && days === preset ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setDays(preset);
                  setCustomDays("");
                }}
              >
                {preset} Days
              </Button>
            ))}
            <Input
              type="number"
              min={1}
              placeholder="Custom"
              className="w-24"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="extend-reason" className="text-sm font-medium">
              Reason
            </label>
            <Textarea
              id="extend-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this trial being extended?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim() || !effectiveDays || effectiveDays <= 0}
          >
            {mutation.isPending ? "Extending..." : "Extend Trial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShopDetailPageContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const [extendOpen, setExtendOpen] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["admin", "shops", id],
    queryFn: () => fetchShop(id),
  });

  const statusMutation = useMutation({
    mutationFn: () => (shop?.status === "SUSPENDED" ? activateShop(id) : suspendShop(id)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops", id] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "shops"] });
      toast.success(shop?.status === "SUSPENDED" ? "Shop activated." : "Shop suspended.");
      setStatusConfirmOpen(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isLoading || !shop) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full max-w-lg" />
      </div>
    );
  }

  const isSuspended = shop.status === "SUSPENDED";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {shop.name} <ShopStatusBadge status={shop.status} />
          </h1>
          <p className="text-muted-foreground">Created {new Date(shop.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExtendOpen(true)} disabled={!shop.subscription}>
            Extend Trial
          </Button>
          <Button variant={isSuspended ? "default" : "destructive"} onClick={() => setStatusConfirmOpen(true)}>
            {isSuspended ? "Activate" : "Suspend"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shop information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Owner</dt>
              <dd>{shop.owner?.name ?? "—"}</dd>
              <dt className="text-muted-foreground">Owner username</dt>
              <dd>{shop.owner?.username ?? "—"}</dd>
              <dt className="text-muted-foreground">Owner email</dt>
              <dd>{shop.owner?.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{shop.phone ?? "—"}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{shop.email ?? "—"}</dd>
              <dt className="text-muted-foreground">Address</dt>
              <dd>{[shop.address, shop.city, shop.country].filter(Boolean).join(", ") || "—"}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {shop.subscription ? (
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Plan</dt>
                <dd>{shop.subscription.plan.name}</dd>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{shop.subscription.status}</dd>
                <dt className="text-muted-foreground">Started</dt>
                <dd>{new Date(shop.subscription.startDate).toLocaleDateString()}</dd>
                <dt className="text-muted-foreground">Ends</dt>
                <dd>{shop.subscription.endDate ? new Date(shop.subscription.endDate).toLocaleDateString() : "No end date"}</dd>
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{shop.subscription.paymentStatus}</dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription on record.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ExtendTrialDialog shopId={id} open={extendOpen} onOpenChange={setExtendOpen} />
      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={isSuspended ? "Activate shop" : "Suspend shop"}
        description={
          isSuspended
            ? `${shop.name} will regain access to the POS.`
            : `${shop.name} will lose access to operational POS actions (sales, purchases, inventory, etc.) until reactivated. They'll still be able to log in and view their data.`
        }
        confirmLabel={isSuspended ? "Activate" : "Suspend"}
        isPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate()}
      />
    </div>
  );
}

export default function AdminShopDetailPage(props: PageProps<"/admin/shops/[id]">) {
  const { id } = use(props.params);
  return (
    <RequirePermission permissions={["PLATFORM_SHOP_VIEW"]}>
      <ShopDetailPageContent id={id} />
    </RequirePermission>
  );
}
