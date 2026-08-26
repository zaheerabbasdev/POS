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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, updateProduct, type ProductDetail } from "@/lib/api/products";
import { fetchCategories } from "@/lib/api/categories";
import { fetchBrands } from "@/lib/api/brands";
import { fetchProductModels } from "@/lib/api/product-models";
import { getApiErrorMessage } from "@/lib/api-client";
import { STATUS_ITEMS } from "@/lib/select-items";

const numberField = (opts?: { min?: number }) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Must be a number")
    .refine((v) => !v || opts?.min === undefined || Number(v) >= opts.min, `Must be at least ${opts?.min ?? 0}`);

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  categoryId: z.string().uuid("Select a category."),
  brandId: z.string().optional(),
  modelId: z.string().optional(),
  purchasePrice: z.string().trim().min(1, "Purchase price is required."),
  sellingPrice: z.string().trim().min(1, "Selling price is required."),
  wholesalePrice: numberField(),
  taxPercentage: numberField(),
  warrantyMonths: numberField({ min: 0 }),
  barcode: z.string().trim().optional(),
  description: z.string().trim().optional(),
  stock: numberField({ min: 0 }),
  imeis: z.string().optional(),
  reorderLevel: numberField({ min: 0 }),
  status: z.enum(["active", "inactive"]),
  tracksImei: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductDetail;
}

const EMPTY_DEFAULTS: ProductFormValues = {
  name: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  purchasePrice: "",
  sellingPrice: "",
  wholesalePrice: "",
  taxPercentage: "",
  warrantyMonths: "",
  barcode: "",
  description: "",
  stock: "",
  imeis: "",
  reorderLevel: "",
  status: "active",
  tracksImei: false,
};

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEditing = Boolean(product);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["categories", { forSelect: true }],
    queryFn: () => fetchCategories({ status: "active", limit: 100 }),
    enabled: open,
  });
  const { data: brands } = useQuery({
    queryKey: ["brands", { forSelect: true }],
    queryFn: () => fetchBrands({ status: "active", limit: 100 }),
    enabled: open,
  });
  const { data: models } = useQuery({
    queryKey: ["product-models", { forSelect: true }],
    queryFn: () => fetchProductModels({ status: "active", limit: 100 }),
    enabled: open,
  });

  const categoryItems = useMemo(
    () => Object.fromEntries((categories?.data ?? []).map((c) => [c.id, c.name])),
    [categories],
  );
  const brandItems = useMemo(() => Object.fromEntries((brands?.data ?? []).map((b) => [b.id, b.name])), [brands]);
  const modelItems = useMemo(() => Object.fromEntries((models?.data ?? []).map((m) => [m.id, m.name])), [models]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const selectedBrandId = watch("brandId");
  const filteredModels = useMemo(
    () => (selectedBrandId ? models?.data.filter((m) => m.brandId === selectedBrandId) : models?.data),
    [models, selectedBrandId],
  );

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        categoryId: product.categoryId,
        brandId: product.brandId ?? "",
        modelId: product.modelId ?? "",
        purchasePrice: product.purchasePrice,
        sellingPrice: product.price,
        wholesalePrice: product.wholesalePrice ?? "",
        taxPercentage: product.taxPercentage,
        warrantyMonths: product.warrantyMonths ? String(product.warrantyMonths) : "",
        barcode: product.barcode ?? "",
        description: product.description ?? "",
        stock: "",
        imeis: "",
        reorderLevel: String(product.reorderLevel),
        status: product.status,
        tracksImei: product.tracksImei,
      });
    } else {
      reset(EMPTY_DEFAULTS);
    }
  }, [open, product, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const shared = {
        name: values.name,
        categoryId: values.categoryId,
        ...(values.brandId ? { brandId: values.brandId } : {}),
        ...(values.modelId ? { modelId: values.modelId } : {}),
        purchasePrice: Number(values.purchasePrice),
        sellingPrice: Number(values.sellingPrice),
        ...(values.wholesalePrice ? { wholesalePrice: Number(values.wholesalePrice) } : {}),
        ...(values.taxPercentage ? { taxPercentage: Number(values.taxPercentage) } : {}),
        ...(values.warrantyMonths ? { warrantyMonths: Number(values.warrantyMonths) } : {}),
        ...(values.barcode ? { barcode: values.barcode } : {}),
        ...(values.description ? { description: values.description } : {}),
        ...(values.reorderLevel ? { reorderLevel: Number(values.reorderLevel) } : {}),
        status: values.status,
        tracksImei: values.tracksImei,
      };

      if (isEditing) return updateProduct(product!.id, shared);
      const imeis = values.imeis
        ?.split(/[\n,]/)
        .map((imei) => imei.trim())
        .filter(Boolean);
      return createProduct({
        ...shared,
        ...(values.stock ? { stock: Number(values.stock) } : {}),
        ...(imeis?.length ? { imeis } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(isEditing ? "Product updated." : "Product created.");
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleFormSubmit = (values: ProductFormValues) => {
    if (!isEditing && values.tracksImei) {
      const imeis = (values.imeis ?? "")
        .split(/[\n,]/)
        .map((imei) => imei.trim())
        .filter(Boolean);
      const stock = Number(values.stock || 0);
      if (imeis.length !== stock) {
        setError("imeis", { message: `Enter exactly ${stock} IMEI number(s) for opening stock.` });
        return;
      }
      if (imeis.some((imei) => !/^\d{15}$/.test(imei))) {
        setError("imeis", { message: "Each IMEI must contain exactly 15 digits." });
        return;
      }
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update this product's details." : "Add a new product to the catalog."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit(handleFormSubmit)}
          noValidate
        >
          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">SKU</span>
              <Input value={product!.sku} disabled />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="product-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select items={categoryItems} value={watch("categoryId")} onValueChange={(v) => setValue("categoryId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.data.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId ? <p className="text-sm text-destructive">{errors.categoryId.message}</p> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Brand</label>
              <Select
                items={brandItems}
                value={watch("brandId")}
                onValueChange={(v) => {
                  setValue("brandId", v ?? "");
                  setValue("modelId", "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.data.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Model</label>
            <Select items={modelItems} value={watch("modelId")} onValueChange={(v) => setValue("modelId", v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model (optional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredModels?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-purchase-price" className="text-sm font-medium">
                Purchase price
              </label>
              <Input id="product-purchase-price" inputMode="decimal" aria-invalid={Boolean(errors.purchasePrice)} {...register("purchasePrice")} />
              {errors.purchasePrice ? <p className="text-sm text-destructive">{errors.purchasePrice.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-selling-price" className="text-sm font-medium">
                Selling price
              </label>
              <Input id="product-selling-price" inputMode="decimal" aria-invalid={Boolean(errors.sellingPrice)} {...register("sellingPrice")} />
              {errors.sellingPrice ? <p className="text-sm text-destructive">{errors.sellingPrice.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-wholesale-price" className="text-sm font-medium">
                Wholesale price
              </label>
              <Input id="product-wholesale-price" inputMode="decimal" {...register("wholesalePrice")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-tax" className="text-sm font-medium">
                Tax %
              </label>
              <Input id="product-tax" inputMode="decimal" {...register("taxPercentage")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-warranty" className="text-sm font-medium">
                Warranty (months)
              </label>
              <Input id="product-warranty" inputMode="numeric" {...register("warrantyMonths")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-barcode" className="text-sm font-medium">
                Barcode
              </label>
              <Input id="product-barcode" {...register("barcode")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea id="product-description" rows={2} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isEditing ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="product-stock" className="text-sm font-medium">
                  Opening stock
                </label>
                <Input id="product-stock" inputMode="numeric" {...register("stock")} />
              </div>
            ) : null}
            {!isEditing && watch("tracksImei") ? (
              <div className="col-span-2 flex flex-col gap-1.5">
                <label htmlFor="product-imeis" className="text-sm font-medium">
                  Opening IMEI numbers (one per line, matching opening stock)
                </label>
                <Textarea
                  id="product-imeis"
                  rows={3}
                  placeholder="One 15-digit IMEI per line"
                  inputMode="numeric"
                  {...register("imeis")}
                  onChange={(event) =>
                    setValue(
                      "imeis",
                      event.target.value
                        .split("\n")
                        .map((line) => line.replace(/\D/g, "").slice(0, 15))
                        .join("\n"),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                />
                {errors.imeis ? <p className="text-sm text-destructive">{errors.imeis.message}</p> : null}
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-reorder-level" className="text-sm font-medium">
                Reorder level
              </label>
              <Input id="product-reorder-level" inputMode="numeric" {...register("reorderLevel")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={watch("tracksImei")} onCheckedChange={(checked) => setValue("tracksImei", checked === true)} />
            Tracks IMEI (mobile phones — leave unchecked for quantity-based accessories)
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Status</label>
            <Select
              items={STATUS_ITEMS}
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as "active" | "inactive")}
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
              {mutation.isPending ? "Saving..." : isEditing ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
