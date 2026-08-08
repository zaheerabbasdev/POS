"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Banknote, RefreshCcw, ShoppingCart, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/stat-tile";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchCurrentDrawer, fetchDrawerSummary, fetchDrawerHistory, openDrawer, closeDrawer, cashIn, cashOut } from "@/lib/api/cash-drawer";
import { getApiErrorMessage } from "@/lib/api-client";

const HISTORY_PAGE_SIZE = 20;

export default function CashDrawerPage() {
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [closingNotes, setClosingNotes] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementRemarks, setMovementRemarks] = useState("");

  const { data: drawer, isLoading: isDrawerLoading } = useQuery({
    queryKey: ["cash-drawer", "current"],
    queryFn: fetchCurrentDrawer,
    refetchInterval: 30_000,
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["cash-drawer", "summary", drawer?.id],
    queryFn: () => fetchDrawerSummary(),
    enabled: Boolean(drawer),
    refetchInterval: 30_000,
  });

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ["cash-drawer"] });
  }

  const openMutation = useMutation({
    mutationFn: () => openDrawer(Number(openingBalance)),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash drawer opened.");
      setOpeningBalance("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeDrawer(Number(closingBalance), closingNotes || undefined),
    onSuccess: (closed) => {
      // Only "current" — once closed there's no open session left for
      // "summary" to fetch, so refetching it would 404 against nothing.
      void queryClient.invalidateQueries({ queryKey: ["cash-drawer", "current"] });
      const diff = Number(closed.difference ?? 0);
      if (diff === 0) toast.success("Cash drawer closed. Balanced exactly.");
      else toast.warning(`Cash drawer closed. Difference: ${diff > 0 ? "+" : ""}${diff}.`);
      setClosingBalance("");
      setClosingNotes("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cashInMutation = useMutation({
    mutationFn: () => cashIn(Number(movementAmount), movementRemarks || undefined),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash in recorded.");
      setMovementAmount("");
      setMovementRemarks("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const cashOutMutation = useMutation({
    mutationFn: () => cashOut(Number(movementAmount), movementRemarks || undefined),
    onSuccess: () => {
      invalidateAll();
      toast.success("Cash out recorded.");
      setMovementAmount("");
      setMovementRemarks("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (isDrawerLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!drawer) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Drawer</h1>
          <p className="text-muted-foreground">No session is currently open.</p>
        </div>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Open Cash Drawer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="opening-balance" className="text-sm font-medium">
                Opening balance
              </label>
              <Input
                id="opening-balance"
                inputMode="decimal"
                placeholder="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>
            <Button disabled={!openingBalance || openMutation.isPending} onClick={() => openMutation.mutate()}>
              {openMutation.isPending ? "Opening..." : "Open Drawer"}
            </Button>
          </CardContent>
        </Card>

        <DrawerHistorySection />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Drawer</h1>
          <p className="text-muted-foreground">
            Opened {new Date(drawer.openedAt).toLocaleString()} by {drawer.cashier}
          </p>
        </div>
        <Badge>OPEN</Badge>
      </div>

      {isSummaryLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <StatTile label="Opening Cash" value={summary.openingCash} icon={Wallet} />
          <StatTile label="Sales Cash" value={summary.salesCash} icon={ShoppingCart} />
          <StatTile label="Cash In" value={summary.cashIn} icon={ArrowDownToLine} />
          <StatTile
            label="Refunds"
            value={summary.refunds}
            icon={RefreshCcw}
            tone={summary.refunds > 0 ? "warning" : "default"}
          />
          <StatTile label="Expenses" value={summary.expenses} icon={Banknote} tone={summary.expenses > 0 ? "warning" : "default"} />
          <StatTile label="Cash Out" value={summary.cashOut} icon={ArrowUpFromLine} />
          <StatTile label="Expected Closing" value={summary.expectedClosingCash} icon={Wallet} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cash In / Cash Out</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              inputMode="decimal"
              placeholder="Amount"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
            />
            <Input
              placeholder="Remarks (optional)"
              value={movementRemarks}
              onChange={(e) => setMovementRemarks(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!movementAmount || cashInMutation.isPending}
                onClick={() => cashInMutation.mutate()}
              >
                Cash In
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!movementAmount || cashOutMutation.isPending}
                onClick={() => cashOutMutation.mutate()}
              >
                Cash Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Close Drawer</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              inputMode="decimal"
              placeholder={`Expected ~${summary?.expectedClosingCash ?? 0}`}
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
            />
            <Input placeholder="Notes (optional)" value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} />
            <Button
              variant="destructive"
              disabled={!closingBalance || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
            >
              {closeMutation.isPending ? "Closing..." : "Close Drawer"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opened</span>
              <span>{new Date(drawer.openedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cashier</span>
              <span>{drawer.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening Balance</span>
              <span>{drawer.openingBalance}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary && summary.transactions.length > 0 ? (
                summary.transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline">{t.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.amount}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.referenceNumber ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.remarks ?? "—"}</TableCell>
                    <TableCell>{new Date(t.createdAt).toLocaleTimeString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DrawerHistorySection />
    </div>
  );
}

/** "Session history (for managers)" — API Spec 37.3's summary is per-session; this is every past session, paginated. */
function DrawerHistorySection() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["cash-drawer", "history", { page }],
    queryFn: () => fetchDrawerHistory({ page, limit: HISTORY_PAGE_SIZE }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">Opening</TableHead>
              <TableHead className="text-right">Closing</TableHead>
              <TableHead className="text-right">Difference</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data && data.data.length > 0 ? (
              data.data.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.cashier}</TableCell>
                  <TableCell>{new Date(session.openedAt).toLocaleString()}</TableCell>
                  <TableCell>{session.closedAt ? new Date(session.closedAt).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">{session.openingBalance}</TableCell>
                  <TableCell className="text-right">{session.closingBalance ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {session.difference !== null && Number(session.difference) !== 0 ? (
                      <span className={Number(session.difference) < 0 ? "text-destructive" : "text-amber-600 dark:text-amber-500"}>
                        {session.difference}
                      </span>
                    ) : (
                      (session.difference ?? "—")
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === "OPEN" ? "default" : "outline"}>{session.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  No past sessions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      {data ? (
        <PaginationControls
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={HISTORY_PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </Card>
  );
}
