"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { fetchBrands, deleteBrand, type Brand } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { BrandFormDialog } from "./brand-form-dialog";

export default function BrandsPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | undefined>(undefined);
  const [deletingBrand, setDeletingBrand] = useState<Brand | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["brands", { search }],
    queryFn: () => fetchBrands({ search: search || undefined, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted.");
      setDeletingBrand(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingBrand(undefined);
    setFormOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-muted-foreground">Manage mobile phone and accessory brands.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Brand
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search brands..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell className="text-muted-foreground">{brand.description ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={brand.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingBrand(brand)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    No brands found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BrandFormDialog open={formOpen} onOpenChange={setFormOpen} brand={editingBrand} />

      <ConfirmDialog
        open={Boolean(deletingBrand)}
        onOpenChange={(open) => !open && setDeletingBrand(undefined)}
        title="Delete brand?"
        description={`This will permanently delete "${deletingBrand?.name}". Brands linked to products can't be deleted — deactivate them instead.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingBrand && deleteMutation.mutate(deletingBrand.id)}
      />
    </div>
  );
}
