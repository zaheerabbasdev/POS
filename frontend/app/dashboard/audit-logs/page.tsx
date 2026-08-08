"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchAuditLogs } from "@/lib/api/audit-logs";

const PAGE_SIZE = 50;

/** Read-only trail (DDD Chapter 31) — gated by AUDIT_VIEW, see layout.tsx. */
export default function AuditLogsPage() {
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", { module, action, startDate, endDate, page }],
    queryFn: () =>
      fetchAuditLogs({
        module: module || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">A trail of sensitive actions — who did what, and when.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-module" className="text-xs text-muted-foreground">
            Module
          </label>
          <Input
            id="audit-module"
            placeholder="e.g. User, Sale, Role..."
            className="w-44"
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-action" className="text-xs text-muted-foreground">
            Action
          </label>
          <Input
            id="audit-action"
            placeholder="e.g. CREATE, DELETE..."
            className="w-44"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-start-date" className="text-xs text-muted-foreground">
            From
          </label>
          <Input
            id="audit-start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-end-date" className="text-xs text-muted-foreground">
            To
          </label>
          <Input
            id="audit-end-date"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.username ?? "system"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.module}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="max-w-md truncate" title={log.description ?? undefined}>
                      {log.description ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No audit entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data ? (
        <PaginationControls
          page={page}
          totalPages={data.pagination.totalPages}
          total={data.pagination.total}
          limit={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
