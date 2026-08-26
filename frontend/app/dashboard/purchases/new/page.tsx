"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPurchase } from "@/lib/api/purchases";
import { fetchSuppliers } from "@/lib/api/suppliers";
import { fetchProducts } from "@/lib/api/products";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";

const itemSchema = z.object({
  productId: z.string().uuid("Select a product."),
  quantity: z.string().trim().min(1, "Required.").refine((v) => Number(v) > 0, "Must be > 0."),
  purchasePrice: z.string().trim().min(1, "Required."),
  imeis: z.string().trim().optional(),
});

const formSchema = z.object({
  supplierId: z.string().uuid("Select a supplier."),
  invoiceNo: z.string().trim().optional(),
  items: z.array(itemSchema).min(1, "Add at least one item."),
  discount: z.string().trim().optional(),
  shippingCost: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  paymentMethod: z.string().optional(),
  paymentAmount: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function parseImeis(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hasValidImeis(imeis: string[]): boolean {
  return imeis.every((imei) => /^\d{15}$/.test(imei));
}

export default function NewPurchasePage() {
  const router = useRouter();

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers", { forSelect: true }],
    queryFn: () => fetchSuppliers({ status: "active", limit: 100 }),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { forSelect: true }],
    queryFn: () => fetchProducts({ status: "active", limit: 100 }),
  });

  const supplierItems = useMemo(
    () => Object.fromEntries((suppliers?.data ?? []).map((s) => [s.id, s.name])),
    [suppliers],
  );
  const productItems = useMemo(
    () => Object.fromEntries((products?.data ?? []).map((p) => [p.id, `${p.name} (${p.sku})`])),
    [products],
  );
  const productById = useMemo(() => new Map((products?.data ?? []).map((p) => [p.id, p])), [products]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: "",
      invoiceNo: "",
      items: [{ productId: "", quantity: "1", purchasePrice: "", imeis: "" }],
      discount: "",
      shippingCost: "",
      remarks: "",
      paymentMethod: "cash",
      paymentAmount: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const total = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.purchasePrice) || 0;
      return sum + qty * price;
    }, 0);
  }, [watchedItems]);

  const mutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: (purchase) => {
      toast.success(`Purchase ${purchase.invoiceNo} created.`);
      router.push(`/dashboard/purchases/${purchase.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const onSubmit = (values: FormValues) => {
    // Cross-field validation (needs the fetched products list, so it can't
    // live in the zod schema): IMEI-tracked products must supply exactly
    // `quantity` IMEIs; non-tracked products must not supply any.
    for (const [index, item] of values.items.entries()) {
      const product = productById.get(item.productId);
      const imeis = parseImeis(item.imeis);
      if (product?.tracksImei && imeis.length !== Number(item.quantity)) {
        setError(`items.${index}.imeis`, {
          message: `"${product.name}" tracks IMEI — enter exactly ${item.quantity} IMEI number(s), one per line.`,
        });
        return;
      }
      if (product?.tracksImei && !hasValidImeis(imeis)) {
        setError(`items.${index}.imeis`, { message: "Each IMEI must contain exactly 15 digits." });
        return;
      }
    }

    mutation.mutate({
      supplierId: values.supplierId,
      invoiceNo: values.invoiceNo || undefined,
      items: values.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        purchasePrice: Number(item.purchasePrice),
        imeis: parseImeis(item.imeis),
      })),
      discount: values.discount ? Number(values.discount) : undefined,
      shippingCost: values.shippingCost ? Number(values.shippingCost) : undefined,
      remarks: values.remarks || undefined,
      payment:
        values.paymentAmount && Number(values.paymentAmount) > 0
          ? { method: values.paymentMethod ?? "cash", amount: Number(values.paymentAmount) }
          : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Purchase</h1>
        <p className="text-muted-foreground">Record a supplier purchase and increase inventory.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Supplier</label>
              <Select items={supplierItems} value={watch("supplierId")} onValueChange={(v) => setValue("supplierId", v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplierId ? <p className="text-sm text-destructive">{errors.supplierId.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="purchase-invoice-no" className="text-sm font-medium">
                Supplier invoice # (optional)
              </label>
              <Input id="purchase-invoice-no" {...register("invoiceNo")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {fields.map((field, index) => {
              const selectedProductId = watchedItems[index]?.productId;
              const selectedProduct = selectedProductId ? productById.get(selectedProductId) : undefined;

              return (
                <div key={field.id} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">Product</label>
                      <Select
                        items={productItems}
                        value={watchedItems[index]?.productId ?? ""}
                        onValueChange={(v) => setValue(`items.${index}.productId`, v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.data.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.items?.[index]?.productId ? (
                        <p className="text-sm text-destructive">{errors.items[index]?.productId?.message}</p>
                      ) : null}
                    </div>
                    <div className="flex w-24 flex-col gap-1.5">
                      <label className="text-sm font-medium">Qty</label>
                      <Input inputMode="numeric" {...register(`items.${index}.quantity`)} />
                    </div>
                    <div className="flex w-32 flex-col gap-1.5">
                      <label className="text-sm font-medium">Unit price</label>
                      <Input inputMode="decimal" {...register(`items.${index}.purchasePrice`)} />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  {selectedProduct?.tracksImei ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium">
                        IMEI numbers ({watchedItems[index]?.quantity ?? 0} required — one per line)
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="One 15-digit IMEI per line"
                        inputMode="numeric"
                        {...register(`items.${index}.imeis`)}
                        onChange={(event) =>
                          setValue(
                            `items.${index}.imeis`,
                            event.target.value
                              .split("\n")
                              .map((line) => line.replace(/\D/g, "").slice(0, 15))
                              .join("\n"),
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      />
                      {errors.items?.[index]?.imeis ? (
                        <p className="text-sm text-destructive">{errors.items[index]?.imeis?.message}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => append({ productId: "", quantity: "1", purchasePrice: "", imeis: "" })}
            >
              <Plus /> Add Item
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Adjustments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Discount</label>
                  <Input inputMode="decimal" {...register("discount")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Shipping cost</label>
                  <Input inputMode="decimal" {...register("shippingCost")} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Remarks</label>
                <Textarea rows={2} {...register("remarks")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items subtotal</span>
                <span className="font-medium">{total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Method</label>
                  <Select
                    items={PAYMENT_METHOD_ITEMS}
                    value={watch("paymentMethod")}
                    onValueChange={(v) => setValue("paymentMethod", v ?? "cash")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Amount paid now</label>
                  <Input inputMode="decimal" placeholder="0 = unpaid" {...register("paymentAmount")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/purchases")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Create Purchase"}
          </Button>
        </div>
      </form>
    </div>
  );
}
