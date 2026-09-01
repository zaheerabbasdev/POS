"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Stack,
  Card,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  Button,
  Group,
  Text,
  Title,
  ActionIcon,
  Divider,
} from "@mantine/core";
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
    () => (suppliers?.data ?? []).map((s) => ({ value: s.id, label: s.name })),
    [suppliers],
  );
  const productItems = useMemo(
    () => (products?.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
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

  const paymentMethodData = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({ value, label }));

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} fw={600}>New Purchase</Title>
        <Text c="dimmed">Record a supplier purchase and increase inventory.</Text>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack gap="md">
          <Card withBorder radius="md">
            <Text fw={600} mb="md">Details</Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Supplier"
                placeholder="Select supplier"
                data={supplierItems}
                value={watch("supplierId")}
                onChange={(v) => setValue("supplierId", v ?? "")}
                error={errors.supplierId?.message}
                searchable
              />
              <TextInput
                label="Supplier invoice # (optional)"
                {...register("invoiceNo")}
                error={errors.invoiceNo?.message}
              />
            </SimpleGrid>
          </Card>

          <Card withBorder radius="md">
            <Text fw={600} mb="md">Items</Text>
            <Stack gap="md">
              {fields.map((field, index) => {
                const selectedProductId = watchedItems[index]?.productId;
                const selectedProduct = selectedProductId ? productById.get(selectedProductId) : undefined;

                return (
                  <Card key={field.id} withBorder radius="md" p="md" bg="var(--mantine-color-gray-0)">
                    <Group align="flex-end" grow>
                      <Select
                        label="Product"
                        placeholder="Select product"
                        data={productItems}
                        value={watchedItems[index]?.productId ?? ""}
                        onChange={(v) => setValue(`items.${index}.productId`, v ?? "")}
                        error={errors.items?.[index]?.productId?.message}
                        searchable
                        style={{ flex: 2 }}
                      />
                      <TextInput
                        label="Qty"
                        inputMode="numeric"
                        {...register(`items.${index}.quantity`)}
                        error={errors.items?.[index]?.quantity?.message}
                      />
                      <TextInput
                        label="Unit price"
                        inputMode="decimal"
                        {...register(`items.${index}.purchasePrice`)}
                        error={errors.items?.[index]?.purchasePrice?.message}
                      />
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="lg"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        style={{ flexGrow: 0 }}
                      >
                        <Trash2 size={18} />
                      </ActionIcon>
                    </Group>

                    {selectedProduct?.tracksImei ? (
                      <Textarea
                        mt="md"
                        label={`IMEI numbers (${watchedItems[index]?.quantity ?? 0} required — one per line)`}
                        rows={3}
                        placeholder="One 15-digit IMEI per line"
                        inputMode="numeric"
                        {...register(`items.${index}.imeis`)}
                        error={errors.items?.[index]?.imeis?.message}
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
                    ) : null}
                  </Card>
                );
              })}

              <Group>
                <Button
                  type="button"
                  variant="outline"
                  leftSection={<Plus size={16} />}
                  onClick={() => append({ productId: "", quantity: "1", purchasePrice: "", imeis: "" })}
                >
                  Add Item
                </Button>
              </Group>
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder radius="md">
              <Text fw={600} mb="md">Adjustments</Text>
              <Stack gap="sm">
                <SimpleGrid cols={2}>
                  <TextInput
                    label="Discount"
                    inputMode="decimal"
                    {...register("discount")}
                    error={errors.discount?.message}
                  />
                  <TextInput
                    label="Shipping cost"
                    inputMode="decimal"
                    {...register("shippingCost")}
                    error={errors.shippingCost?.message}
                  />
                </SimpleGrid>
                <Textarea
                  label="Remarks"
                  rows={2}
                  {...register("remarks")}
                  error={errors.remarks?.message}
                />
              </Stack>
            </Card>

            <Card withBorder radius="md">
              <Text fw={600} mb="md">Payment</Text>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Items subtotal</Text>
                  <Text fw={500}>{total.toFixed(2)}</Text>
                </Group>
                <Divider />
                <SimpleGrid cols={2}>
                  <Select
                    label="Method"
                    data={paymentMethodData}
                    value={watch("paymentMethod")}
                    onChange={(v) => setValue("paymentMethod", v ?? "cash")}
                  />
                  <TextInput
                    label="Amount paid now"
                    inputMode="decimal"
                    placeholder="0 = unpaid"
                    {...register("paymentAmount")}
                    error={errors.paymentAmount?.message}
                  />
                </SimpleGrid>
              </Stack>
            </Card>
          </SimpleGrid>

          <Group justify="flex-end" mt="sm">
            <Button type="button" variant="default" onClick={() => router.push("/dashboard/purchases")}>
              Cancel
            </Button>
            <Button type="submit" color="indigo" disabled={isSubmitting || mutation.isPending} loading={mutation.isPending}>
              Create Purchase
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
}
