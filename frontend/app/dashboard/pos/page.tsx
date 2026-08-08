"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchProducts, type ProductListItem } from "@/lib/api/products";
import { fetchCustomers } from "@/lib/api/customers";
import { createSale } from "@/lib/api/sales";
import { getApiErrorMessage } from "@/lib/api-client";
import { PAYMENT_METHOD_ITEMS } from "@/lib/select-items";

interface CartLine {
  key: string;
  productId: string;
  name: string;
  sku: string;
  tracksImei: boolean;
  price: number;
  quantity: number;
  imei: string;
  maxStock: number;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
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
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");

  const { data: searchResults } = useQuery({
    queryKey: ["products", "pos-search", debouncedSearch],
    queryFn: () => fetchProducts({ search: debouncedSearch, status: "active", limit: 10 }),
    enabled: debouncedSearch.length > 0,
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
    () => ({ "": "Walk-in customer", ...Object.fromEntries((customers?.data ?? []).map((c) => [c.id, c.name])) }),
    [customers],
  );

  const addToCart = (product: ProductListItem) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" is out of stock.`);
      return;
    }

    if (product.tracksImei) {
      setCart((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          sku: product.sku,
          tracksImei: true,
          price: Number(product.price),
          quantity: 1,
          imei: "",
          maxStock: product.stock,
        },
      ]);
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

  const updateLine = (key: string, patch: Partial<CartLine>) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((line) => line.key !== key));

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const totalAmount = Math.max(0, subtotal - (Number(discount) || 0));

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => {
      toast.success(`Sale ${sale.invoiceNumber} completed.`);
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
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

    mutation.mutate({
      customerId: customerId || undefined,
      items: cart.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        price: line.price,
        imei: line.tracksImei ? line.imei.trim() : undefined,
      })),
      discount: Number(discount) || undefined,
      payment:
        paidAmount && Number(paidAmount) > 0 ? { method: paymentMethod, paidAmount: Number(paidAmount) } : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground">Search a product by name, SKU, or barcode to add it to the cart.</p>
        </div>

        <div className="relative" ref={searchContainerRef}>
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            autoFocus
            placeholder="Search products..."
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          {isSearchOpen && searchResults && searchResults.data.length > 0 ? (
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
                            value={line.imei}
                            onChange={(e) => updateLine(line.key, { imei: e.target.value })}
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
                      <TableCell className="text-right font-medium">
                        {(line.price * line.quantity).toFixed(2)}
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
            <label className="text-sm font-medium">Customer</label>
            <Select items={customerItems} value={customerId} onValueChange={(v) => setCustomerId(v ?? "")}>
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
            <label className="text-sm font-medium">Discount</label>
            <Input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{(Number(discount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Payment method</label>
            <Select items={PAYMENT_METHOD_ITEMS} value={paymentMethod} onValueChange={(v) => setPaymentMethod(v ?? "cash")}>
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Amount paid</label>
              <button
                type="button"
                className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => setPaidAmount(totalAmount.toFixed(2))}
              >
                Full amount
              </button>
            </div>
            <Input inputMode="decimal" placeholder="0 = unpaid" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
          </div>

          <Button size="lg" className="mt-2 w-full" disabled={mutation.isPending} onClick={handleCompleteSale}>
            <Plus /> {mutation.isPending ? "Processing..." : "Complete Sale"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
