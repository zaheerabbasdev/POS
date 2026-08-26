"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Minus, PauseCircle, Plus, ScanLine, Search, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    // Storage disabled/full — held sales just won't persist across a reload, not fatal.
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

  // "Add new customer" — a dedicated button next to the Customer field
  // (not a dropdown option) that opens a modal, so a cashier never leaves
  // the sale screen but the flow doesn't compete for space with the select.
  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);

  // Lazy initializers (not a mount effect calling setState — this page is
  // gated behind an auth check that already renders a loading skeleton
  // client-side first, so there's no meaningful server-rendered content for
  // these to mismatch against).
  const [barcodeMode, setBarcodeMode] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(BARCODE_MODE_KEY) === "true",
  );
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => (typeof window === "undefined" ? [] : loadHeldSales()));

  const { data: searchResults } = useQuery({
    queryKey: ["products", "pos-search", debouncedSearch],
    queryFn: () => fetchProducts({ search: debouncedSearch, status: "active", limit: 10 }),
    enabled: debouncedSearch.length > 0,
    // "Live" stock — a stale badge here is exactly what let two cashiers
    // both think an item was available; re-check every few seconds while
    // the dropdown could be showing it.
    refetchInterval: 5000,
  });

  // Closes the search dropdown on an outside click — it otherwise stays
  // open forever, since visibility was previously driven only by whether
  // searchResults had data (which lingers as stale cache after selecting).
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
  const customerItems = useMemo(
    () => ({
      "": "Walk-in customer",
      ...Object.fromEntries((customers?.data ?? []).map((c) => [c.id, c.name])),
    }),
    [customers],
  );

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
        const availableImei = product.availableImeis.find((imei) => !selectedImeis.has(imei)) ?? "";
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

    // Close the dropdown and clear the box for both branches — previously
    // the IMEI branch returned early and skipped this, leaving the
    // dropdown open after every scan of a tracked product.
    setSearch("");
    setIsSearchOpen(false);
    searchInputRef.current?.focus();
  };

  // Barcode-scanner mode: a scanner types the code then sends Enter itself.
  // Waiting on the 250ms-debounced search query would often lose that race,
  // so this does its own immediate lookup instead of relying on
  // `searchResults`, and adds the top match straight to the cart.
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

  // --- Split payment ---
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

  // --- Hold sale / resume later (a lightweight "draft sale") ---
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

  // "Proceed" — load the draft back into the working cart.
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

  // "Cancel" — discard the draft entirely, no undo.
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
      // Auto-open the printable invoice in a new tab so the cashier doesn't
      // have to find and click "Print Invoice" from the sale detail page.
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

  // Keyboard shortcuts: Enter completes the sale, Esc clears the cart —
  // both skipped while actually typing in a field, so cashiers can type an
  // IMEI or a discount without accidentally submitting or wiping the cart.
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
    // No dependency array — intentionally re-subscribes every render so the
    // handler's closure always sees the current cart/customer/discount/payments.
  });

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
            <p className="text-muted-foreground">Search a product by name, SKU, or barcode to add it to the cart.</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="relative inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm hover:bg-muted">
                <Clock className="size-4" />
                Held Sales
                {heldSales.length > 0 ? <Badge className="ml-1">{heldSales.length}</Badge> : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Held Sales</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {heldSales.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">Nothing held right now.</div>
                  ) : (
                    heldSales.map((held) => (
                      <DropdownMenuItem
                        key={held.id}
                        onSelect={(e) => e.preventDefault()}
                        className="flex flex-col items-stretch gap-1.5"
                      >
                        <div>
                          <span className="block font-medium">{held.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {held.cart.length} item{held.cart.length === 1 ? "" : "s"} ·{" "}
                            {new Date(held.savedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {/*
                            style={{ color }} directly on the icons below:
                            DropdownMenuItem forces `focus:**:text-accent-foreground`
                            onto every descendant while the row is hovered —
                            that wildcard sets `color` directly on the nested
                            <svg> itself, not just the <button>, so a
                            Tailwind className on the icon was still losing
                            that fight. An inline `style` always wins over a
                            non-!important external class rule regardless of
                            the selector, so this is the guaranteed fix.
                          */}
                          <Button
                            size="sm"
                            className="h-7 flex-1 text-xs text-primary-foreground!"
                            onClick={() => proceedHeldSale(held.id)}
                          >
                            <Check style={{ color: "var(--primary-foreground)" }} /> Proceed
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 flex-1 text-xs text-destructive!"
                            onClick={() => cancelHeldSale(held.id)}
                          >
                            <X style={{ color: "var(--destructive)" }} /> Cancel
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={holdSale}>
              <PauseCircle /> Hold Sale
            </Button>
          </div>
        </div>

        <div className="relative" ref={searchContainerRef}>
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            autoFocus
            placeholder={barcodeMode ? "Scan a barcode..." : "Search products..."}
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onKeyDown={(e) => void handleSearchKeyDown(e)}
          />
          {isSearchOpen && !barcodeMode && searchResults && searchResults.data.length > 0 ? (
            <Card className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto py-1">
              {searchResults.data.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => addToCart(product)}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {product.sku} · {product.price}
                    </span>
                  </span>
                  <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>Stock: {product.stock}</Badge>
                </button>
              ))}
            </Card>
          ) : null}
        </div>

        <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={barcodeMode} onCheckedChange={(checked) => toggleBarcodeMode(checked === true)} />
          <ScanLine className="size-4" />
          Barcode scanner mode — pressing Enter adds the matched product straight to the cart
        </label>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cart is empty — search for a product above.
                    </TableCell>
                  </TableRow>
                ) : (
                  cart.map((line) => (
                    <TableRow key={line.key}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{line.name}</span>
                          <span className="text-xs text-muted-foreground">{line.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {line.tracksImei ? (
                          <Input
                            className="h-8 w-36"
                            placeholder="Enter IMEI"
                            inputMode="numeric"
                            maxLength={15}
                            value={line.imei}
                            onChange={(e) => updateLine(line.key, { imei: e.target.value.replace(/\D/g, "").slice(0, 15) })}
                          />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.tracksImei ? (
                          1
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              disabled={line.quantity <= 1}
                              onClick={() => updateLine(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                            >
                              <Minus />
                            </Button>
                            <Input
                              className="h-8 w-14 text-center"
                              inputMode="numeric"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Math.max(1, Math.min(Number(e.target.value) || 1, line.maxStock)),
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              disabled={line.quantity >= line.maxStock}
                              onClick={() =>
                                updateLine(line.key, { quantity: Math.min(line.maxStock, line.quantity + 1) })
                              }
                            >
                              <Plus />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 w-24 text-right"
                          inputMode="decimal"
                          value={line.price}
                          onChange={(e) => updateLine(line.key, { price: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          className="h-8 w-20 text-right"
                          inputMode="decimal"
                          placeholder="0"
                          value={line.discount || ""}
                          onChange={(e) => updateLine(line.key, { discount: Number(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(line.price * line.quantity - line.discount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeLine(line.key)}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full lg:w-96">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Customer</label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => setQuickAddCustomerOpen(true)}
              >
                <UserPlus className="size-3.5" /> Add New Customer
              </button>
            </div>
            <Select items={customerItems} value={customerId} onValueChange={(v) => selectCustomer(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Walk-in customer</SelectItem>
                {customers?.data.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Discount (whole cart)</label>
            <Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{(itemDiscountTotal + overallDiscount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Payment</label>
              <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={addPaymentRow}>
                + Split payment
              </button>
            </div>
            {payments.map((row) => (
              <div key={row.id} className="flex items-center gap-1.5">
                <Select
                  items={PAYMENT_METHOD_ITEMS}
                  value={row.method}
                  onValueChange={(v) => updatePaymentRow(row.id, { method: v ?? "cash" })}
                >
                  <SelectTrigger className="w-32">
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
                <Input
                  inputMode="decimal"
                  placeholder="0 = unpaid"
                  className="flex-1"
                  value={row.amount}
                  onChange={(e) => updatePaymentRow(row.id, { amount: e.target.value })}
                />
                <Button variant="ghost" size="sm" className="shrink-0 px-2 text-xs" onClick={() => fillRemaining(row.id)}>
                  Fill
                </Button>
                {payments.length > 1 ? (
                  <Button variant="ghost" size="icon-sm" onClick={() => removePaymentRow(row.id)} aria-label="Remove payment">
                    <X />
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid: {paidTotal.toFixed(2)}</span>
              <span className={remainingDue > 0 ? "text-destructive" : ""}>Due: {remainingDue.toFixed(2)}</span>
            </div>
          </div>

          <Button size="lg" className="mt-2 w-full" disabled={mutation.isPending} onClick={handleCompleteSale}>
            <Plus /> {mutation.isPending ? "Processing..." : "Complete Sale"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Press <kbd className="rounded border px-1">Enter</kbd> to complete · <kbd className="rounded border px-1">Esc</kbd> to
            clear the cart
          </p>
        </CardContent>
      </Card>

      <QuickAddCustomerDialog
        open={quickAddCustomerOpen}
        onOpenChange={setQuickAddCustomerOpen}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}
