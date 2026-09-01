"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Minus, PauseCircle, Plus, ScanLine, Search, Trash2, UserPlus, X } from "lucide-react";
import {
  Button,
  TextInput,
  Badge,
  Checkbox,
  Card,
  Table,
  Select,
  Menu,
  Stack,
  Group,
  Text,
  Title,
  ActionIcon,
  UnstyledButton,
  ScrollArea,
  Divider,
} from "@mantine/core";
import { fetchProducts, type ProductListItem } from "@/lib/api/products";
import { fetchCustomers, type Customer } from "@/lib/api/customers";
import { createSale } from "@/lib/api/sales";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";
import { QuickAddCustomerDialog } from "./quick-add-customer-dialog";

interface CartLine {
  key: string;
  productId: string;
  name: string;
  sku: string;
  tracksImei: boolean;
  price: number;
  quantity: number;
  discount: number;
  imei: string;
  maxStock: number;
}

interface PaymentRow {
  id: string;
  method: string;
  amount: string;
}

interface HeldSale {
  id: string;
  savedAt: string;
  label: string;
  cart: CartLine[];
  customerId: string;
  discount: string;
}

const HELD_SALES_KEY = "pos-held-sales";
const BARCODE_MODE_KEY = "pos-barcode-mode";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function loadHeldSales(): HeldSale[] {
  try {
    const raw = localStorage.getItem(HELD_SALES_KEY);
    return raw ? (JSON.parse(raw) as HeldSale[]) : [];
  } catch {
    return [];
  }
}

function saveHeldSales(sales: HeldSale[]): void {
  try {
    localStorage.setItem(HELD_SALES_KEY, JSON.stringify(sales));
  } catch {
    // Storage disabled/full
  }
}

export default function PosPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in customer");
  const [discount, setDiscount] = useState("");
  const [payments, setPayments] = useState<PaymentRow[]>([{ id: crypto.randomUUID(), method: "cash", amount: "" }]);

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);

  const [barcodeMode, setBarcodeMode] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(BARCODE_MODE_KEY) === "true",
  );
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => (typeof window === "undefined" ? [] : loadHeldSales()));

  const { data: searchResults } = useQuery({
    queryKey: ["products", "pos-search", debouncedSearch],
    queryFn: () => fetchProducts({ search: debouncedSearch, status: "active", limit: 10 }),
    enabled: debouncedSearch.length > 0,
    refetchInterval: 5000,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: customers } = useQuery({
    queryKey: ["customers", { forSelect: true }],
    queryFn: () => fetchCustomers({ status: "active", limit: 100 }),
  });
  
  const customerItems = useMemo(() => {
    const defaultOption = { value: "", label: "Walk-in customer" };
    const fetchedOptions = (customers?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
    return [defaultOption, ...fetchedOptions];
  }, [customers]);

  const selectCustomer = (id: string) => {
    setCustomerId(id);
    setCustomerName(id ? (customers?.data.find((c) => c.id === id)?.name ?? "Customer") : "Walk-in customer");
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
  };

  const addToCart = (product: ProductListItem) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }

    if (product.tracksImei) {
      setCart((prev) => {
        const selectedImeis = new Set(
          prev.filter((line) => line.productId === product.id).map((line) => line.imei),
        );
        const availableImei = (product.availableImeis ?? []).find((imei) => !selectedImeis.has(imei)) ?? "";
        return [
          ...prev,
          {
            key: crypto.randomUUID(),
            productId: product.id,
            name: product.name,
            sku: product.sku,
            tracksImei: true,
            price: Number(product.price),
            quantity: 1,
            discount: 0,
            imei: availableImei,
            maxStock: product.stock,
          },
        ];
      });
    } else {
      setCart((prev) => {
        const existing = prev.find((line) => line.productId === product.id && !line.tracksImei);
        if (existing) {
          return prev.map((line) =>
            line.key === existing.key ? { ...line, quantity: Math.min(line.quantity + 1, line.maxStock) } : line,
          );
        }
        return [
          ...prev,
          {
            key: crypto.randomUUID(),
            productId: product.id,
            name: product.name,
            sku: product.sku,
            tracksImei: false,
            price: Number(product.price),
            quantity: 1,
            discount: 0,
            imei: "",
            maxStock: product.stock,
          },
        ];
      });
    }

    setSearch("");
    setIsSearchOpen(false);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !barcodeMode) return;
    e.preventDefault();
    const query = search.trim();
    if (!query) return;
    try {
      const result = await fetchProducts({ search: query, status: "active", limit: 1 });
      const top = result.data[0];
      if (top) {
        addToCart(top);
      } else {
        toast.error(`No product found for "${query}".`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const toggleBarcodeMode = (checked: boolean) => {
    setBarcodeMode(checked);
    try {
      localStorage.setItem(BARCODE_MODE_KEY, String(checked));
    } catch {
      // ignore
    }
  };

  const updateLine = (key: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((line) => line.key !== key));

  const clearSale = () => {
    setCart([]);
    setCustomerId("");
    setCustomerName("Walk-in customer");
    setDiscount("");
    setPayments([{ id: crypto.randomUUID(), method: "cash", amount: "" }]);
  };

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const itemDiscountTotal = cart.reduce((sum, line) => sum + (line.discount || 0), 0);
  const overallDiscount = Number(discount) || 0;
  const totalAmount = Math.max(0, subtotal - itemDiscountTotal - overallDiscount);

  const paidTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingDue = Math.max(0, totalAmount - paidTotal);

  const addPaymentRow = () => setPayments((prev) => [...prev, { id: crypto.randomUUID(), method: "cash", amount: "" }]);
  const removePaymentRow = (id: string) => setPayments((prev) => prev.filter((p) => p.id !== id));
  const updatePaymentRow = (id: string, patch: Partial<PaymentRow>) =>
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const fillRemaining = (id: string) => {
    const row = payments.find((p) => p.id === id);
    if (!row) return;
    const others = paidTotal - (Number(row.amount) || 0);
    updatePaymentRow(id, { amount: Math.max(0, totalAmount - others).toFixed(2) });
  };

  const holdSale = () => {
    if (cart.length === 0) {
      toast.error("Nothing to hold — the cart is empty.");
      return;
    }
    const held: HeldSale = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      label: customerName,
      cart,
      customerId,
      discount,
    };
    const next = [held, ...heldSales];
    setHeldSales(next);
    saveHeldSales(next);
    clearSale();
    toast.success('Sale held — resume it anytime from "Held Sales".');
  };

  const proceedHeldSale = (id: string) => {
    const held = heldSales.find((h) => h.id === id);
    if (!held) return;
    setCart(held.cart);
    setCustomerId(held.customerId);
    setCustomerName(held.label);
    setDiscount(held.discount);
    const next = heldSales.filter((h) => h.id !== id);
    setHeldSales(next);
    saveHeldSales(next);
    toast.success("Held sale resumed.");
  };

  const cancelHeldSale = (id: string) => {
    const next = heldSales.filter((h) => h.id !== id);
    setHeldSales(next);
    saveHeldSales(next);
    toast.info("Held sale discarded.");
  };

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      toast.success(`Sale ${sale.invoiceNumber} completed.`);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      window.open(`/print/sales/${sale.id}`, "_blank");
      router.push(`/dashboard/sales/${sale.id}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast.error("Add at least one item to the cart.");
      return;
    }
    const missingImei = cart.find((line) => line.tracksImei && !line.imei.trim());
    if (missingImei) {
      toast.error(`Enter the IMEI for "${missingImei.name}".`);
      return;
    }

    const validPayments = payments
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({ method: p.method, paidAmount: Number(p.amount) }));

    mutation.mutate({
      customerId: customerId || undefined,
      items: cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        price: line.price,
        discount: line.discount || undefined,
        imei: line.tracksImei ? line.imei.trim() : undefined,
      })),
      discount: overallDiscount || undefined,
      payments: validPayments.length > 0 ? validPayments : undefined,
    });
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping) return;
      if (e.key === "Enter") {
        e.preventDefault();
        handleCompleteSale();
      } else if (e.key === "Escape" && cart.length > 0) {
        setCart([]);
        toast.info("Cart cleared.");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const paymentMethodData = Object.entries(PAYMENT_METHOD_ITEMS).map(([value, label]) => ({ value, label }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minHeight: "100%" }}>
      <Group justify="space-between" align="flex-start" className="lg:flex-row flex-col">
        <div>
          <Title order={2} fw={600}>New Sale</Title>
          <Text c="dimmed" size="sm">Search a product by name, SKU, or barcode to add it to the cart.</Text>
        </div>
        <Group gap="sm">
          <Menu shadow="md" width={300} position="bottom-end">
            <Menu.Target>
              <Button variant="default" leftSection={<Clock size={16} />}>
                Held Sales
                {heldSales.length > 0 ? <Badge ml="xs" size="sm" color="indigo">{heldSales.length}</Badge> : null}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Held Sales</Menu.Label>
              <Menu.Divider />
              {heldSales.length === 0 ? (
                <Text p="md" ta="center" size="sm" c="dimmed">Nothing held right now.</Text>
              ) : (
                heldSales.map((held) => (
                  <Menu.Item key={held.id} closeMenuOnClick={false}>
                    <Stack gap="xs">
                      <Box>
                        <Text fw={500} size="sm">{held.label}</Text>
                        <Text size="xs" c="dimmed">
                          {held.cart.length} item{held.cart.length === 1 ? "" : "s"} ·{" "}
                          {new Date(held.savedAt).toLocaleTimeString()}
                        </Text>
                      </Box>
                      <Group gap="xs" grow>
                        <Button
                          size="xs"
                          color="indigo"
                          onClick={() => proceedHeldSale(held.id)}
                          leftSection={<Check size={14} />}
                        >
                          Proceed
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          color="red"
                          onClick={() => cancelHeldSale(held.id)}
                          leftSection={<X size={14} />}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Stack>
                  </Menu.Item>
                ))
              )}
            </Menu.Dropdown>
          </Menu>

          <Button variant="outline" color="gray" onClick={holdSale} leftSection={<PauseCircle size={16} />}>
            Hold Sale
          </Button>
        </Group>
      </Group>

      <div style={{ display: "flex", gap: "1rem" }} className="lg:flex-row flex-col">
        <Stack style={{ flex: 1 }} gap="md">
          <div style={{ position: "relative" }} ref={searchContainerRef}>
            <TextInput
              ref={searchInputRef}
              autoFocus
              placeholder={barcodeMode ? "Scan a barcode..." : "Search products..."}
              leftSection={<Search size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => void handleSearchKeyDown(e)}
              size="lg"
              radius="md"
            />
            {isSearchOpen && !barcodeMode && searchResults && searchResults.data.length > 0 ? (
              <Card withBorder shadow="sm" radius="md" p={0} style={{ position: "absolute", zIndex: 10, top: "100%", left: 0, right: 0, marginTop: "4px" }}>
                <ScrollArea.Autosize mah={300}>
                  {searchResults.data.map((product) => (
                    <UnstyledButton
                      key={product.id}
                      onClick={() => addToCart(product)}
                      style={(theme) => ({
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
                        "&:hover": { backgroundColor: "var(--mantine-color-gray-0)" },
                      })}
                    >
                      <Stack gap={0}>
                        <Text fw={500} size="sm">{product.name}</Text>
                        <Text size="xs" c="dimmed">
                          {product.sku} · {product.price}
                        </Text>
                      </Stack>
                      <Badge color={product.stock > 0 ? "gray" : "red"} variant="light">
                        Stock: {product.stock}
                      </Badge>
                    </UnstyledButton>
                  ))}
                </ScrollArea.Autosize>
              </Card>
            ) : null}
          </div>

          <Checkbox
            label={
              <Group gap="xs">
                <ScanLine size={16} />
                <Text size="sm" c="dimmed">Barcode scanner mode — pressing Enter adds the matched product straight to the cart</Text>
              </Group>
            }
            checked={barcodeMode}
            onChange={(e) => toggleBarcodeMode(e.currentTarget.checked)}
          />

          <Card withBorder radius="md" p={0}>
            <ScrollArea>
              <Table verticalSpacing="sm" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>IMEI</Table.Th>
                    <Table.Th ta="right">Qty</Table.Th>
                    <Table.Th ta="right">Price</Table.Th>
                    <Table.Th ta="right">Discount</Table.Th>
                    <Table.Th ta="right">Line Total</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {cart.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} ta="center" py="xl">
                        <Text c="dimmed" size="sm">Cart is empty — search for a product above.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    cart.map((line) => (
                      <Table.Tr key={line.key}>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text fw={500} size="sm">{line.name}</Text>
                            <Text size="xs" c="dimmed">{line.sku}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          {line.tracksImei ? (
                            <TextInput
                              placeholder="Enter IMEI"
                              inputMode="numeric"
                              maxLength={15}
                              value={line.imei}
                              onChange={(e) => updateLine(line.key, { imei: e.currentTarget.value.replace(/\D/g, "").slice(0, 15) })}
                              w={140}
                            />
                          ) : (
                            <Text c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {line.tracksImei ? (
                            <Text ta="right">1</Text>
                          ) : (
                            <Group gap="xs" justify="flex-end" wrap="nowrap">
                              <ActionIcon
                                variant="default"
                                disabled={line.quantity <= 1}
                                onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                              >
                                <Minus size={14} />
                              </ActionIcon>
                              <TextInput
                                inputMode="numeric"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(line.key, {
                                    quantity: Math.max(1, Math.min(Number(e.currentTarget.value) || 1, line.maxStock)),
                                  })
                                }
                                w={60}
                                styles={{ input: { textAlign: "center" } }}
                              />
                              <ActionIcon
                                variant="default"
                                disabled={line.quantity >= line.maxStock}
                                onClick={() =>
                                  updateLine(line.key, { quantity: Math.min(line.maxStock, line.quantity + 1) })
                                }
                              >
                                <Plus size={14} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            inputMode="decimal"
                            value={line.price}
                            onChange={(e) => updateLine(line.key, { price: Number(e.currentTarget.value) || 0 })}
                            w={100}
                            style={{ marginLeft: "auto" }}
                            styles={{ input: { textAlign: "right" } }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            inputMode="decimal"
                            placeholder="0"
                            value={line.discount || ""}
                            onChange={(e) => updateLine(line.key, { discount: Number(e.currentTarget.value) || 0 })}
                            w={90}
                            style={{ marginLeft: "auto" }}
                            styles={{ input: { textAlign: "right" } }}
                          />
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text fw={500}>{(line.price * line.quantity - line.discount).toFixed(2)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon color="red" variant="subtle" onClick={() => removeLine(line.key)}>
                            <Trash2 size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Stack>

        <Card withBorder radius="md" style={{ width: "380px", flexShrink: 0 }}>
          <Stack gap="md">
            <Title order={3} fw={600} size="h4">Checkout</Title>
            
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Customer</Text>
                <UnstyledButton
                  onClick={() => setQuickAddCustomerOpen(true)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--mantine-color-indigo-6)" }}
                >
                  <UserPlus size={14} /> <Text td="underline">Add New Customer</Text>
                </UnstyledButton>
              </Group>
              <Select
                data={customerItems}
                value={customerId}
                onChange={(v) => selectCustomer(v ?? "")}
                searchable
              />
            </Stack>

            <TextInput
              label="Discount (whole cart)"
              inputMode="decimal"
              value={discount}
              onChange={(e) => setDiscount(e.currentTarget.value)}
            />

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Subtotal</Text>
                <Text size="sm">{subtotal.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Discount</Text>
                <Text size="sm">-{(itemDiscountTotal + overallDiscount).toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600} size="lg">Total</Text>
                <Text fw={600} size="lg">{totalAmount.toFixed(2)}</Text>
              </Group>
            </Stack>

            <Divider />

            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500}>Payment</Text>
                <UnstyledButton
                  onClick={addPaymentRow}
                  style={{ fontSize: "12px", color: "var(--mantine-color-indigo-6)", textDecoration: "underline" }}
                >
                  + Split payment
                </UnstyledButton>
              </Group>
              
              {payments.map((row) => (
                <Group key={row.id} gap="xs" wrap="nowrap">
                  <Select
                    data={paymentMethodData}
                    value={row.method}
                    onChange={(v) => updatePaymentRow(row.id, { method: v ?? "cash" })}
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    inputMode="decimal"
                    placeholder="0 = unpaid"
                    value={row.amount}
                    onChange={(e) => updatePaymentRow(row.id, { amount: e.currentTarget.value })}
                    style={{ flex: 1.5 }}
                  />
                  <Button variant="light" color="gray" size="sm" px="xs" onClick={() => fillRemaining(row.id)}>
                    Fill
                  </Button>
                  {payments.length > 1 ? (
                    <ActionIcon color="red" variant="subtle" onClick={() => removePaymentRow(row.id)}>
                      <X size={16} />
                    </ActionIcon>
                  ) : null}
                </Group>
              ))}

              <Group justify="space-between" mt="xs">
                <Text size="xs" c="dimmed">Paid: {paidTotal.toFixed(2)}</Text>
                <Text size="xs" c={remainingDue > 0 ? "red" : "dimmed"}>Due: {remainingDue.toFixed(2)}</Text>
              </Group>
            </Stack>

            <Button
              size="lg"
              color="indigo"
              fullWidth
              leftSection={<Plus size={18} />}
              disabled={mutation.isPending}
              loading={mutation.isPending}
              onClick={handleCompleteSale}
              mt="sm"
            >
              Complete Sale
            </Button>
            <Text ta="center" size="xs" c="dimmed">
              Press <Kbd>Enter</Kbd> to complete · <Kbd>Esc</Kbd> to clear the cart
            </Text>
          </Stack>
        </Card>
      </div>

      <QuickAddCustomerDialog
        open={quickAddCustomerOpen}
        onOpenChange={setQuickAddCustomerOpen}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: "var(--mantine-radius-sm)", padding: "2px 4px", backgroundColor: "var(--mantine-color-gray-0)" }}>
      {children}
    </span>
  );
}

// Add the missing Box import by extracting it inline
function Box({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
