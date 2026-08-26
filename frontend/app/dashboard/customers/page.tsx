"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { PaginationControls } from "@/components/pagination-controls";
import { fetchCustomerHistory, fetchCustomers, type Customer, type CustomerHistory } from "@/lib/api/customers";
import { CustomerFormDialog } from "./customer-form-dialog";

const PAGE_SIZE = 50;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { search, page }],
    queryFn: () => fetchCustomers({ search: search || undefined, page, limit: PAGE_SIZE }),
  });

  const openCreate = () => {
    setEditingCustomer(undefined);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage customer records and outstanding balances.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Customer
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or code..."
          className="pl-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
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
                data.data.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{customer.customerCode}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.customerType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(customer.outstandingBalance) > 0 ? (
                        <span className="text-destructive">{customer.outstandingBalance}</span>
                      ) : (
                        customer.outstandingBalance
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryCustomer(customer)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No customers found.
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

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editingCustomer} />
      <CustomerHistoryDialog customer={historyCustomer} onOpenChange={(open) => !open && setHistoryCustomer(undefined)} />
    </div>
  );
}

function CustomerHistoryDialog({
  customer,
  onOpenChange,
}: {
  customer?: Customer;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery<CustomerHistory>({
    queryKey: ["customers", customer?.id, "history"],
    queryFn: () => fetchCustomerHistory(customer!.id),
    enabled: Boolean(customer),
  });

  return (
    <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer?.name} - Purchase History</DialogTitle>
          <DialogDescription>Sales and payments recorded for this customer.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading history...</p>
        ) : data && data.sales.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs">{sale.invoiceNumber}</TableCell>
                  <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                  <TableCell>{sale.paymentStatus}</TableCell>
                  <TableCell className="text-right">{sale.totalAmount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No purchases found for this customer.</p>
        )}
        {data ? <p className="text-right text-sm font-medium">Outstanding: {data.outstandingBalance}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
