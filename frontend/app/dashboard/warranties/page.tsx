"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchWarranties, type Warranty } from "@/lib/api/warranties";
import { ClaimDialog } from "./claim-dialog";

const STATUS_ITEMS = { all: "All statuses", ACTIVE: "Active", EXPIRED: "Expired", CLAIMED: "Claimed", CANCELLED: "Cancelled" };
const PAGE_SIZE = 50;

const STATUS_VARIANT: Record<Warranty["status"], "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  EXPIRED: "outline",
  CLAIMED: "secondary",
  CANCELLED: "destructive",
};

export default function WarrantiesPage() {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["warranties", { status, page }],
    queryFn: () => fetchWarranties({ status: status === "all" ? undefined : (status as Warranty["status"]), page, limit: PAGE_SIZE }),
  });

  const openClaim = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setClaimOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Warranties</h1>
        <p className="text-muted-foreground">Track product warranties and process claims.</p>
      </div>

      <div className="max-w-xs">
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(v) => {
            setStatus(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_ITEMS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                data.data.map((warranty) => (
                  <TableRow key={warranty.id}>
                    <TableCell className="font-medium">{warranty.product}</TableCell>
                    <TableCell>{warranty.customer}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{warranty.invoiceNumber}</TableCell>
                    <TableCell>{warranty.periodMonths} mo</TableCell>
                    <TableCell>{new Date(warranty.expiryDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[warranty.status]}>{warranty.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {warranty.status === "ACTIVE" ? (
                        <Button variant="ghost" size="sm" onClick={() => openClaim(warranty)}>
                          Claim
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No warranties found.
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

      <ClaimDialog open={claimOpen} onOpenChange={setClaimOpen} warranty={selectedWarranty} />
    </div>
  );
}
