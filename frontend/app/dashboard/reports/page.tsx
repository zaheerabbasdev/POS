"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, PackageX, ReceiptText, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatTile } from "@/components/stat-tile";
import { ExportMenu } from "@/components/export-menu";
import {
  fetchCustomerBalance,
  fetchCustomerPurchases,
  fetchDailySales,
  fetchEmployeeSales,
  fetchLowStockReport,
  fetchProductSales,
  fetchProfitLoss,
  fetchPurchaseSummary,
  fetchCashFlow,
  fetchSalesSummary,
  fetchStockReport,
  fetchSupplierBalance,
  fetchSupplierPurchases,
} from "@/lib/api/reports";

const CATEGORY_ITEMS = {
  sales: "Sales",
  purchases: "Purchases",
  inventory: "Inventory",
  financial: "Financial",
  customers: "Customers",
  suppliers: "Suppliers",
};

export default function ReportsPage() {
  const [category, setCategory] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const range = { startDate: startDate || undefined, endDate: endDate || undefined };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Business insights across sales, purchases, inventory, and finances.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select items={CATEGORY_ITEMS} value={category} onValueChange={(v) => setCategory(v ?? "sales")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-start-date" className="text-xs text-muted-foreground">
            From
          </label>
          <Input id="report-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-end-date" className="text-xs text-muted-foreground">
            To
          </label>
          <Input id="report-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {category === "sales" ? <SalesReports range={range} /> : null}
      {category === "purchases" ? <PurchaseReports range={range} /> : null}
      {category === "inventory" ? <InventoryReports /> : null}
      {category === "financial" ? <FinancialReports range={range} /> : null}
      {category === "customers" ? <CustomerReports range={range} /> : null}
      {category === "suppliers" ? <SupplierReports /> : null}
    </div>
  );
}

interface Range {
  startDate?: string;
  endDate?: string;
}

function SalesReports({ range }: { range: Range }) {
  const { data: summary } = useQuery({ queryKey: ["reports", "sales-summary", range], queryFn: () => fetchSalesSummary(range) });
  const { data: daily, isLoading: dailyLoading } = useQuery({ queryKey: ["reports", "sales-daily", range], queryFn: () => fetchDailySales(range) });
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["reports", "sales-products", range],
    queryFn: () => fetchProductSales(range),
  });
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ["reports", "sales-employees", range],
    queryFn: () => fetchEmployeeSales(range),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Sales Summary</h2>
        <ExportMenu reportType="sales/summary" filters={range} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total Sales" value={summary?.totalSales ?? 0} icon={Wallet} />
        <StatTile label="Total Invoices" value={summary?.totalInvoices ?? 0} icon={ReceiptText} />
        <StatTile label="Average Sale" value={summary?.averageSale ?? 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daily Sales</CardTitle>
            <ExportMenu reportType="sales/daily" filters={range} />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily && daily.length > 0 ? (
                  daily.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell className="text-right">{row.invoices}</TableCell>
                      <TableCell className="text-right">{row.totalSales}</TableCell>
                      <TableCell className="text-right">{row.cashSales}</TableCell>
                      <TableCell className="text-right">{row.creditSales}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {dailyLoading ? "Loading..." : "No sales in range."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sales by Employee</CardTitle>
            <ExportMenu reportType="sales/employees" filters={range} />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees && employees.length > 0 ? (
                  employees.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">{row.employeeName}</TableCell>
                      <TableCell className="text-right">{row.transactions}</TableCell>
                      <TableCell className="text-right">{row.totalSales}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      {employeesLoading ? "Loading..." : "No sales in range."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales by Product</CardTitle>
          <ExportMenu reportType="sales/products" filters={range} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? (
                products.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-right">{row.quantitySold}</TableCell>
                    <TableCell className="text-right">{row.revenue}</TableCell>
                    <TableCell className="text-right">{row.profit}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {productsLoading ? "Loading..." : "No sales in range."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PurchaseReports({ range }: { range: Range }) {
  const { data: summary } = useQuery({ queryKey: ["reports", "purchase-summary", range], queryFn: () => fetchPurchaseSummary(range) });
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["reports", "purchase-suppliers", range],
    queryFn: () => fetchSupplierPurchases(range),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Purchase Summary</h2>
        <ExportMenu reportType="purchases/summary" filters={range} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total Purchases" value={summary?.totalPurchases ?? 0} icon={ReceiptText} />
        <StatTile label="Total Amount" value={summary?.totalAmount ?? 0} icon={Wallet} />
        <StatTile label="Suppliers" value={summary?.supplierCount ?? 0} icon={TrendingUp} />
        <StatTile
          label="Pending Payments"
          value={summary?.pendingPayments ?? 0}
          icon={TrendingDown}
          tone={(summary?.pendingPayments ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchases by Supplier</CardTitle>
          <ExportMenu reportType="purchases/suppliers" filters={range} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers && suppliers.length > 0 ? (
                suppliers.map((row) => (
                  <TableRow key={row.supplierId}>
                    <TableCell className="font-medium">{row.supplierName}</TableCell>
                    <TableCell className="text-right">{row.purchaseCount}</TableCell>
                    <TableCell className="text-right">{row.totalAmount}</TableCell>
                    <TableCell className="text-right">
                      {row.outstandingBalance > 0 ? <span className="text-destructive">{row.outstandingBalance}</span> : row.outstandingBalance}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {suppliersLoading ? "Loading..." : "No purchases in range."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryReports() {
  const { data: stock, isLoading: stockLoading } = useQuery({ queryKey: ["reports", "inventory-stock"], queryFn: fetchStockReport });
  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ["reports", "inventory-low-stock"],
    queryFn: fetchLowStockReport,
  });

  const totalStockValue = stock?.reduce((sum, row) => sum + row.stockValue, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total Stock Value" value={totalStockValue} icon={Wallet} />
        <StatTile label="Products Tracked" value={stock?.length ?? 0} icon={ReceiptText} />
        <StatTile
          label="Low / Out of Stock"
          value={lowStock?.length ?? 0}
          icon={PackageX}
          tone={(lowStock?.length ?? 0) > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Low Stock</CardTitle>
          <ExportMenu reportType="inventory/low-stock" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock && lowStock.length > 0 ? (
                lowStock.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.sku}</TableCell>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-right text-destructive">{row.currentStock}</TableCell>
                    <TableCell className="text-right">{row.reorderLevel}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {lowStockLoading ? "Loading..." : "Nothing low on stock."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Value</CardTitle>
          <ExportMenu reportType="inventory/stock" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Available Qty</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock && stock.length > 0 ? (
                stock.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.sku}</TableCell>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="text-right">{row.availableQuantity}</TableCell>
                    <TableCell className="text-right">{row.purchasePrice}</TableCell>
                    <TableCell className="text-right">{row.stockValue}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    {stockLoading ? "Loading..." : "No inventory records."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialReports({ range }: { range: Range }) {
  const { data: pnl } = useQuery({ queryKey: ["reports", "profit-loss", range], queryFn: () => fetchProfitLoss(range) });
  const { data: cashFlow } = useQuery({ queryKey: ["reports", "cash-flow", range], queryFn: () => fetchCashFlow(range) });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profit &amp; Loss</CardTitle>
          <ExportMenu reportType="financial/profit-loss" filters={range} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total Sales" value={pnl?.totalSales ?? 0} icon={Wallet} />
            <StatTile label="Cost of Goods Sold" value={pnl?.costOfGoodsSold ?? 0} icon={TrendingDown} />
            <StatTile label="Expenses" value={pnl?.expenses ?? 0} icon={ReceiptText} />
            <StatTile
              label="Net Profit"
              value={pnl?.netProfit ?? 0}
              icon={BadgeDollarSign}
              tone={(pnl?.netProfit ?? 0) < 0 ? "critical" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cash Flow</CardTitle>
          <ExportMenu reportType="financial/cash-flow" filters={range} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Cash In" value={cashFlow?.cashIn ?? 0} icon={TrendingUp} />
            <StatTile label="Cash Out" value={cashFlow?.cashOut ?? 0} icon={TrendingDown} />
            <StatTile label="Net Position" value={cashFlow?.currentBalance ?? 0} icon={Wallet} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerReports({ range }: { range: Range }) {
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["reports", "customer-purchases", range],
    queryFn: () => fetchCustomerPurchases(range),
  });
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["reports", "customer-balance"],
    queryFn: fetchCustomerBalance,
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Purchases</CardTitle>
          <ExportMenu reportType="customers/purchases" filters={range} />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Last Purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases && purchases.length > 0 ? (
                purchases.map((row) => (
                  <TableRow key={row.customerId}>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-right">{row.totalPurchases}</TableCell>
                    <TableCell className="text-right">{row.totalAmount}</TableCell>
                    <TableCell>{new Date(row.lastPurchaseDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {purchasesLoading ? "Loading..." : "No purchases in range."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Balances</CardTitle>
          <ExportMenu reportType="customers/balance" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances && balances.length > 0 ? (
                balances.map((row) => (
                  <TableRow key={row.customerId}>
                    <TableCell className="font-medium">{row.customerName}</TableCell>
                    <TableCell className="text-right">{row.creditLimit}</TableCell>
                    <TableCell className="text-right">{row.paidAmount}</TableCell>
                    <TableCell className="text-right">
                      {Number(row.remainingBalance) > 0 ? <span className="text-destructive">{row.remainingBalance}</span> : row.remainingBalance}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {balancesLoading ? "Loading..." : "No customers."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierReports() {
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["reports", "supplier-balance"],
    queryFn: fetchSupplierBalance,
  });
  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["reports", "supplier-purchases-view"],
    queryFn: () => fetchSupplierPurchases({}),
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Supplier Balances</CardTitle>
          <ExportMenu reportType="suppliers/balance" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Purchases</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances && balances.length > 0 ? (
                balances.map((row) => (
                  <TableRow key={row.supplierId}>
                    <TableCell className="font-medium">{row.supplierName}</TableCell>
                    <TableCell className="text-right">{row.totalPurchases}</TableCell>
                    <TableCell className="text-right">{row.paidAmount}</TableCell>
                    <TableCell className="text-right">
                      {Number(row.remainingAmount) > 0 ? <span className="text-destructive">{row.remainingAmount}</span> : row.remainingAmount}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    {balancesLoading ? "Loading..." : "No suppliers."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Purchase History</CardTitle>
          <ExportMenu reportType="suppliers/payments" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases && purchases.length > 0 ? (
                purchases.map((row) => (
                  <TableRow key={row.supplierId}>
                    <TableCell className="font-medium">{row.supplierName}</TableCell>
                    <TableCell className="text-right">{row.purchaseCount}</TableCell>
                    <TableCell className="text-right">{row.totalAmount}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    {purchasesLoading ? "Loading..." : "No purchase history."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
