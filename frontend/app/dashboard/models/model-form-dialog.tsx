"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProductModel, updateProductModel, type ProductModel } from "@/lib/api/product-models";
import { fetchBrands } from "@/lib/api/brands";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const modelFormSchema = z.object({
  name: z.string().trim().min(1, "Model name is required."),
  brandId: z.string().uuid("Select a brand."),
  releaseYear: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]),
});

type ModelFormValues = z.infer<typeof modelFormSchema>;

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: ProductModel;
}

export function ModelFormDialog({ open, onOpenChange, model }: ModelFormDialogProps) {
  const isEditing = Boolean(model);
  const queryClient = useQueryClient();

  const { data: brands } = useQuery({
    queryKey: ["brands", { forSelect: true }],
    queryFn: () => fetchBrands({ status: "active", limit: 100 }),
    enabled: open,
  });
  const brandItems = useMemo(
    () => Object.fromEntries((brands?.data ?? []).map((b) => [b.id, b.name])),
    [brands],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { name: "", brandId: "", releaseYear: "", description: "", status: "active" },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: model?.name ?? "",
        brandId: model?.brandId ?? "",
        releaseYear: model?.releaseYear ? String(model.releaseYear) : "",
        description: model?.description ?? "",
        status: model?.status ?? "active",
      });
    }
  }, [open, model, reset]);

  const mutation = useMutation({
    mutationFn: (values: ModelFormValues) => {
      const payload = {
        name: values.name,
        brandId: values.brandId,
        description: values.description,
        status: values.status,
        ...(values.releaseYear ? { releaseYear: Number(values.releaseYear) } : {}),
      };
      return isEditing ? updateProductModel(model!.id, payload) : createProductModel(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product-models"] });
      toast.success(isEditing ? "Model updated." : "Model created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Model" : "Add Model"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this phone model's details." : "Create a new phone model or variant."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="model-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="model-name" placeholder="e.g. iPhone 15 Pro" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Brand</label>
            <Select items={brandItems} value={watch("brandId")} onValueChange={(value) => setValue("brandId", value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands?.data.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.brandId ? <p className="text-sm text-destructive">{errors.brandId.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="model-release-year" className="text-sm font-medium">
              Release year
            </label>
            <Input id="model-release-year" inputMode="numeric" placeholder="e.g. 2023" {...register("releaseYear")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="model-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="model-description" rows={2} {...register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={STATUS_ITEMS}
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "active" | "inactive")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
