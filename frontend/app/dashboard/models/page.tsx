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
import { fetchProductModels, deleteProductModel, type ProductModel } from "@/lib/api/product-models";
import { getApiErrorMessage } from "@/lib/api-client";
import { ModelFormDialog } from "./model-form-dialog";

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ProductModel | undefined>(undefined);
  const [deletingModel, setDeletingModel] = useState<ProductModel | undefined>(undefined);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["product-models", { search }],
    queryFn: () => fetchProductModels({ search: search || undefined, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProductModel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-models"] });
      toast.success("Model deleted.");
      setDeletingModel(undefined);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openCreate = () => {
    setEditingModel(undefined);
    setFormOpen(true);
  };

  const openEdit = (model: ProductModel) => {
    setEditingModel(model);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Product Models</h1>
          <p className="text-muted-foreground">Manage phone models and variants.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus /> Add Model
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search models..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Release Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data && data.data.length > 0 ? (
                data.data.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.brand}</TableCell>
                    <TableCell className="text-muted-foreground">{model.releaseYear ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={model.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(model)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingModel(model)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No models found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ModelFormDialog open={formOpen} onOpenChange={setFormOpen} model={editingModel} />

      <ConfirmDialog
        open={Boolean(deletingModel)}
        onOpenChange={(open) => !open && setDeletingModel(undefined)}
        title="Delete model?"
        description={`This will permanently delete "${deletingModel?.name}". Models linked to products can't be deleted — deactivate them instead.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deletingModel && deleteMutation.mutate(deletingModel.id)}
      />
    </div>
  );
}
