"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Modal,
  Stack,
  SimpleGrid,
  TextInput,
  Textarea,
  Checkbox,
  Select,
  Button,
  Group,
  Text,
  ScrollArea,
} from "@mantine/core";
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
    () => (categories?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );
  const brandItems = useMemo(
    () => (brands?.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [brands],
  );

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
  const modelItems = useMemo(
    () => (filteredModels ?? []).map((m) => ({ value: m.id, label: m.name })),
    [filteredModels],
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
    <Modal
      opened={open}
      onClose={() => onOpenChange(false)}
      title={<Text fw={600}>{isEditing ? "Edit Product" : "Add Product"}</Text>}
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {isEditing ? "Update this product's details." : "Add a new product to the catalog."}
        </Text>

        <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
          <Stack gap="md">
            {isEditing ? (
              <TextInput label="SKU" value={product!.sku} disabled />
            ) : null}

            <TextInput
              label="Name"
              {...register("name")}
              error={errors.name?.message}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Category"
                data={categoryItems}
                placeholder="Select category"
                value={watch("categoryId")}
                onChange={(v) => setValue("categoryId", v ?? "")}
                error={errors.categoryId?.message}
              />

              <Select
                label="Brand"
                data={brandItems}
                placeholder="Select brand"
                value={watch("brandId")}
                onChange={(v) => {
                  setValue("brandId", v ?? "");
                  setValue("modelId", "");
                }}
              />
            </SimpleGrid>

            <Select
              label="Model"
              data={modelItems}
              placeholder="Select model (optional)"
              value={watch("modelId")}
              onChange={(v) => setValue("modelId", v ?? "")}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Purchase price"
                inputMode="decimal"
                {...register("purchasePrice")}
                error={errors.purchasePrice?.message}
              />
              <TextInput
                label="Selling price"
                inputMode="decimal"
                {...register("sellingPrice")}
                error={errors.sellingPrice?.message}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Wholesale price"
                inputMode="decimal"
                {...register("wholesalePrice")}
                error={errors.wholesalePrice?.message}
              />
              <TextInput
                label="Tax %"
                inputMode="decimal"
                {...register("taxPercentage")}
                error={errors.taxPercentage?.message}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Warranty (months)"
                inputMode="numeric"
                {...register("warrantyMonths")}
                error={errors.warrantyMonths?.message}
              />
              <TextInput
                label="Barcode"
                {...register("barcode")}
                error={errors.barcode?.message}
              />
            </SimpleGrid>

            <Textarea
              label="Description"
              rows={2}
              {...register("description")}
              error={errors.description?.message}
            />

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {!isEditing ? (
                <TextInput
                  label="Opening stock"
                  inputMode="numeric"
                  {...register("stock")}
                  error={errors.stock?.message}
                />
              ) : null}

              {!isEditing && watch("tracksImei") ? (
                <Textarea
                  label="Opening IMEI numbers"
                  description="One 15-digit IMEI per line, matching opening stock"
                  rows={3}
                  inputMode="numeric"
                  {...register("imeis")}
                  error={errors.imeis?.message}
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
              ) : null}

              <TextInput
                label="Reorder level"
                inputMode="numeric"
                {...register("reorderLevel")}
                error={errors.reorderLevel?.message}
              />
            </SimpleGrid>

            <Checkbox
              label="Tracks IMEI (mobile phones — leave unchecked for quantity-based accessories)"
              checked={watch("tracksImei")}
              onChange={(e) => setValue("tracksImei", e.currentTarget.checked)}
            />

            <Select
              label="Status"
              data={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              value={watch("status")}
              onChange={(v) => setValue("status", v as "active" | "inactive")}
            />

            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
                {isEditing ? "Save changes" : "Create product"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
