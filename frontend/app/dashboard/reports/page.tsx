"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeDollarSign, PackageX, ReceiptText, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Stack,
  Group,
  TextInput,
  Select,
  Card,
  Text,
  SimpleGrid,
  Table,
} from "@mantine/core";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { ExportMenu } from "@/components/export-menu";
import { DataTable } from "@/components/data-table";
import { MoneyText } from "@/components/currency-display";
import {
  fetchCustomerBalance,
  fetchCustomerPurchases,
  fetchDailySales,
  fetchEmployeeSales,
  fetchFinancialExpenses,
  fetchImeiReport,
  fetchLowStockReport,
  fetchProductSales,
  fetchProfitLoss,
  fetchPurchaseSummary,
  fetchCashFlow,
  fetchSalesSummary,
  fetchStockMovement,
  fetchStockReport,
  fetchSupplierBalance,
  fetchSupplierPurchases,
} from "@/lib/api/reports";

const CATEGORY_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "purchases", label: "Purchases" },
  { value: "inventory", label: "Inventory" },
  { value: "financial", label: "Financial" },
  { value: "customers", label: "Customers" },
  { value: "suppliers", label: "Suppliers" },
];

export default function ReportsPage() {
  const [category, setCategory] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const range = { startDate: startDate || undefined, endDate: endDate || undefined };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Reports"
        description="Business insights across sales, purchases, inventory, and finances."
      />

      <Group align="flex-end" gap="md">
        <Select
          label="Category"
          data={CATEGORY_OPTIONS}
          value={category}
          onChange={(v) => setCategory(v ?? "sales")}
          w={200}
        />
        <TextInput
          label="From"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.currentTarget.value)}
        />
        <TextInput
          label="To"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.currentTarget.value)}
        />
      </Group>

      {category === "sales" && <SalesReports range={range} />}
      {category === "purchases" && <PurchaseReports range={range} />}
      {category === "inventory" && <InventoryReports range={range} />}
      {category === "financial" && <FinancialReports range={range} />}
      {category === "customers" && <CustomerReports range={range} />}
      {category === "suppliers" && <SupplierReports />}
    </Stack>
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
    <Stack gap="lg">
      <Group justify="space-between">
        <Text fw={600} c="dimmed">Sales Summary</Text>
        <ExportMenu reportType="sales/summary" filters={range} />
      </Group>
      
      <SimpleGrid cols={{ base: 2, md: 3 }} spacing="lg">
        <StatTile label="Total Sales" value={summary?.totalSales ?? 0} icon={Wallet} />
        <StatTile label="Total Invoices" value={summary?.totalInvoices ?? 0} icon={ReceiptText} />
        <StatTile label="Average Sale" value={summary?.averageSale ?? 0} icon={TrendingUp} />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card shadow="sm" radius="md" withBorder padding={0}>
          <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <Text fw={600}>Daily Sales</Text>
            <ExportMenu reportType="sales/daily" filters={range} />
          </Group>
          <DataTable
            data={daily ?? []}
            isLoading={dailyLoading}
            keyExtractor={(row) => row.date}
            emptyTitle="No sales in range."
            columns={[
              { key: "date", header: "Date", render: (r) => <Text size="sm">{r.date}</Text> },
              { key: "invoices", header: "Invoices", align: "right", render: (r) => <Text size="sm">{r.invoices}</Text> },
              { key: "total", header: "Total", align: "right", render: (r) => <MoneyText value={r.totalSales} /> },
              { key: "cash", header: "Cash", align: "right", render: (r) => <MoneyText value={r.cashSales} /> },
              { key: "credit", header: "Credit", align: "right", render: (r) => <MoneyText value={r.creditSales} /> },
            ]}
          />
        </Card>

        <Card shadow="sm" radius="md" withBorder padding={0}>
          <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
            <Text fw={600}>Sales by Employee</Text>
            <ExportMenu reportType="sales/employees" filters={range} />
          </Group>
          <DataTable
            data={employees ?? []}
            isLoading={employeesLoading}
            keyExtractor={(row) => row.employeeId}
            emptyTitle="No sales in range."
            columns={[
              { key: "employee", header: "Employee", render: (r) => <Text size="sm" fw={500}>{r.employeeName}</Text> },
              { key: "transactions", header: "Transactions", align: "right", render: (r) => <Text size="sm">{r.transactions}</Text> },
              { key: "total", header: "Total Sales", align: "right", render: (r) => <MoneyText value={r.totalSales} /> },
            ]}
          />
        </Card>
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Sales by Product</Text>
          <ExportMenu reportType="sales/products" filters={range} />
        </Group>
        <DataTable
          data={products ?? []}
          isLoading={productsLoading}
          keyExtractor={(row) => row.productId}
          emptyTitle="No sales in range."
          columns={[
            { key: "product", header: "Product", render: (r) => <Text size="sm" fw={500}>{r.productName}</Text> },
            { key: "qty", header: "Qty Sold", align: "right", render: (r) => <Text size="sm">{r.quantitySold}</Text> },
            { key: "revenue", header: "Revenue", align: "right", render: (r) => <MoneyText value={r.revenue} /> },
            { key: "profit", header: "Profit", align: "right", render: (r) => <MoneyText value={r.profit} /> },
          ]}
        />
      </Card>
    </Stack>
  );
}

function PurchaseReports({ range }: { range: Range }) {
  const { data: summary } = useQuery({ queryKey: ["reports", "purchase-summary", range], queryFn: () => fetchPurchaseSummary(range) });
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["reports", "purchase-suppliers", range],
    queryFn: () => fetchSupplierPurchases(range),
  });

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text fw={600} c="dimmed">Purchase Summary</Text>
        <ExportMenu reportType="purchases/summary" filters={range} />
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatTile label="Total Purchases" value={summary?.totalPurchases ?? 0} icon={ReceiptText} />
        <StatTile label="Total Amount" value={summary?.totalAmount ?? 0} icon={Wallet} />
        <StatTile label="Suppliers" value={summary?.supplierCount ?? 0} icon={TrendingUp} />
        <StatTile
          label="Pending Payments"
          value={summary?.pendingPayments ?? 0}
          icon={TrendingDown}
          tone={(summary?.pendingPayments ?? 0) > 0 ? "warning" : "default"}
        />
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Purchases by Supplier</Text>
          <ExportMenu reportType="purchases/suppliers" filters={range} />
        </Group>
        <DataTable
          data={suppliers ?? []}
          isLoading={suppliersLoading}
          keyExtractor={(row) => row.supplierId}
          emptyTitle="No purchases in range."
          columns={[
            { key: "supplier", header: "Supplier", render: (r) => <Text size="sm" fw={500}>{r.supplierName}</Text> },
            { key: "purchases", header: "Purchases", align: "right", render: (r) => <Text size="sm">{r.purchaseCount}</Text> },
            { key: "total", header: "Total Amount", align: "right", render: (r) => <MoneyText value={r.totalAmount} /> },
            {
              key: "outstanding",
              header: "Outstanding",
              align: "right",
              render: (r) => (
                <Text size="sm" c={r.outstandingBalance > 0 ? "red" : undefined}>
                  <MoneyText value={r.outstandingBalance} />
                </Text>
              ),
            },
          ]}
        />
      </Card>
    </Stack>
  );
}

function InventoryReports({ range }: { range: Range }) {
  const { data: stock, isLoading: stockLoading } = useQuery({ queryKey: ["reports", "inventory-stock"], queryFn: fetchStockReport });
  const { data: lowStock, isLoading: lowStockLoading } = useQuery({
    queryKey: ["reports", "inventory-low-stock"],
    queryFn: fetchLowStockReport,
  });
  const { data: movement, isLoading: movementLoading } = useQuery({
    queryKey: ["reports", "inventory-movement", range],
    queryFn: () => fetchStockMovement(range),
  });
  const { data: imeis, isLoading: imeisLoading } = useQuery({
    queryKey: ["reports", "inventory-imei"],
    queryFn: () => fetchImeiReport(),
  });

  const totalStockValue = stock?.reduce((sum, row) => sum + row.stockValue, 0) ?? 0;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 2, md: 3 }} spacing="lg">
        <StatTile label="Total Stock Value" value={totalStockValue} icon={Wallet} />
        <StatTile label="Products Tracked" value={stock?.length ?? 0} icon={ReceiptText} />
        <StatTile
          label="Low / Out of Stock"
          value={lowStock?.length ?? 0}
          icon={PackageX}
          tone={(lowStock?.length ?? 0) > 0 ? "warning" : "default"}
        />
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Low Stock</Text>
          <ExportMenu reportType="inventory/low-stock" />
        </Group>
        <DataTable
          data={lowStock ?? []}
          isLoading={lowStockLoading}
          keyExtractor={(row) => row.productId}
          emptyTitle="Nothing low on stock."
          columns={[
            {
              key: "sku",
              header: "SKU",
              render: (r) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.sku}
                </Text>
              ),
            },
            { key: "product", header: "Product", render: (r) => <Text size="sm" fw={500}>{r.productName}</Text> },
            { key: "current", header: "Current Stock", align: "right", render: (r) => <Text size="sm" c="red">{r.currentStock}</Text> },
            { key: "reorder", header: "Reorder Level", align: "right", render: (r) => <Text size="sm">{r.reorderLevel}</Text> },
          ]}
        />
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Stock Value</Text>
          <ExportMenu reportType="inventory/stock" />
        </Group>
        <DataTable
          data={stock ?? []}
          isLoading={stockLoading}
          keyExtractor={(row) => row.productId}
          emptyTitle="No inventory records."
          columns={[
            {
              key: "sku",
              header: "SKU",
              render: (r) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.sku}
                </Text>
              ),
            },
            { key: "product", header: "Product", render: (r) => <Text size="sm" fw={500}>{r.productName}</Text> },
            { key: "available", header: "Available Qty", align: "right", render: (r) => <Text size="sm">{r.availableQuantity}</Text> },
            { key: "price", header: "Purchase Price", align: "right", render: (r) => <MoneyText value={r.purchasePrice} /> },
            { key: "value", header: "Stock Value", align: "right", render: (r) => <MoneyText value={r.stockValue} /> },
          ]}
        />
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Stock Movement</Text>
          <ExportMenu reportType="inventory/movement" filters={range} />
        </Group>
        <DataTable
          data={movement ?? []}
          isLoading={movementLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No stock movement in range."
          columns={[
            { key: "date", header: "Date", render: (r) => <Text size="sm">{new Date(r.date).toLocaleDateString()}</Text> },
            {
              key: "sku",
              header: "SKU",
              render: (r) => (
                <Text size="xs" c="dimmed" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.sku}
                </Text>
              ),
            },
            { key: "product", header: "Product", render: (r) => <Text size="sm" fw={500}>{r.productName}</Text> },
            { key: "type", header: "Type", render: (r) => <Text size="sm">{r.type}</Text> },
            { key: "qty", header: "Qty", align: "right", render: (r) => <Text size="sm">{r.quantity}</Text> },
            {
              key: "reference",
              header: "Reference",
              render: (r) => (
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.referenceNumber ?? "—"}
                </Text>
              ),
            },
          ]}
        />
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>IMEI Register</Text>
          <ExportMenu reportType="inventory/imei" />
        </Group>
        <DataTable
          data={imeis ?? []}
          isLoading={imeisLoading}
          keyExtractor={(row) => row.imei}
          emptyTitle="No IMEIs recorded."
          columns={[
            {
              key: "imei",
              header: "IMEI",
              render: (r) => (
                <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)" }}>
                  {r.imei}
                </Text>
              ),
            },
            { key: "product", header: "Product", render: (r) => <Text size="sm" fw={500}>{r.productName}</Text> },
            { key: "status", header: "Status", render: (r) => <Text size="sm">{r.saleStatus}</Text> },
            { key: "warranty", header: "Warranty", render: (r) => <Text size="sm">{r.warrantyStatus ?? "—"}</Text> },
            { key: "purchased", header: "Purchased", render: (r) => <Text size="sm">{r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : "—"}</Text> },
          ]}
        />
      </Card>
    </Stack>
  );
}

function FinancialReports({ range }: { range: Range }) {
  const { data: pnl } = useQuery({ queryKey: ["reports", "profit-loss", range], queryFn: () => fetchProfitLoss(range) });
  const { data: cashFlow } = useQuery({ queryKey: ["reports", "cash-flow", range], queryFn: () => fetchCashFlow(range) });
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["reports", "financial-expenses", range],
    queryFn: () => fetchFinancialExpenses(range),
  });

  return (
    <Stack gap="lg">
      <Card shadow="sm" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Profit &amp; Loss</Text>
          <ExportMenu reportType="financial/profit-loss" filters={range} />
        </Group>
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <StatTile label="Total Sales" value={pnl?.totalSales ?? 0} icon={Wallet} />
          <StatTile label="Cost of Goods Sold" value={pnl?.costOfGoodsSold ?? 0} icon={TrendingDown} />
          <StatTile label="Expenses" value={pnl?.expenses ?? 0} icon={ReceiptText} />
          <StatTile
            label="Net Profit"
            value={pnl?.netProfit ?? 0}
            icon={BadgeDollarSign}
            tone={(pnl?.netProfit ?? 0) < 0 ? "critical" : "default"}
          />
        </SimpleGrid>
      </Card>

      <Card shadow="sm" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>Cash Flow</Text>
          <ExportMenu reportType="financial/cash-flow" filters={range} />
        </Group>
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="lg">
          <StatTile label="Cash In" value={cashFlow?.cashIn ?? 0} icon={TrendingUp} />
          <StatTile label="Cash Out" value={cashFlow?.cashOut ?? 0} icon={TrendingDown} />
          <StatTile label="Net Position" value={cashFlow?.currentBalance ?? 0} icon={Wallet} />
        </SimpleGrid>
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Expenses</Text>
          <ExportMenu reportType="financial/expenses" filters={range} />
        </Group>
        <DataTable
          data={expenses ?? []}
          isLoading={expensesLoading}
          keyExtractor={(row) => row.id}
          emptyTitle="No expenses in range."
          columns={[
            { key: "date", header: "Date", render: (r) => <Text size="sm">{new Date(r.date).toLocaleDateString()}</Text> },
            { key: "category", header: "Category", render: (r) => <Text size="sm" fw={500}>{r.category}</Text> },
            { key: "recordedBy", header: "Recorded By", render: (r) => <Text size="sm">{r.employee ?? "—"}</Text> },
            { key: "amount", header: "Amount", align: "right", render: (r) => <MoneyText value={r.amount} /> },
          ]}
        />
      </Card>
    </Stack>
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
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Customer Purchases</Text>
          <ExportMenu reportType="customers/purchases" filters={range} />
        </Group>
        <DataTable
          data={purchases ?? []}
          isLoading={purchasesLoading}
          keyExtractor={(row) => row.customerId}
          emptyTitle="No purchases in range."
          columns={[
            { key: "customer", header: "Customer", render: (r) => <Text size="sm" fw={500}>{r.customerName}</Text> },
            { key: "purchases", header: "Purchases", align: "right", render: (r) => <Text size="sm">{r.totalPurchases}</Text> },
            { key: "total", header: "Total", align: "right", render: (r) => <MoneyText value={r.totalAmount} /> },
            { key: "lastPurchase", header: "Last Purchase", render: (r) => <Text size="sm">{new Date(r.lastPurchaseDate).toLocaleDateString()}</Text> },
          ]}
        />
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Customer Balances</Text>
          <ExportMenu reportType="customers/balance" />
        </Group>
        <DataTable
          data={balances ?? []}
          isLoading={balancesLoading}
          keyExtractor={(row) => row.customerId}
          emptyTitle="No customers."
          columns={[
            { key: "customer", header: "Customer", render: (r) => <Text size="sm" fw={500}>{r.customerName}</Text> },
            { key: "creditLimit", header: "Credit Limit", align: "right", render: (r) => <MoneyText value={r.creditLimit} /> },
            { key: "paid", header: "Paid", align: "right", render: (r) => <MoneyText value={r.paidAmount} /> },
            {
              key: "remaining",
              header: "Remaining",
              align: "right",
              render: (r) => (
                <Text size="sm" c={Number(r.remainingBalance) > 0 ? "red" : undefined}>
                  <MoneyText value={r.remainingBalance} />
                </Text>
              ),
            },
          ]}
        />
      </Card>
    </SimpleGrid>
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
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Supplier Balances</Text>
          <ExportMenu reportType="suppliers/balance" />
        </Group>
        <DataTable
          data={balances ?? []}
          isLoading={balancesLoading}
          keyExtractor={(row) => row.supplierId}
          emptyTitle="No suppliers."
          columns={[
            { key: "supplier", header: "Supplier", render: (r) => <Text size="sm" fw={500}>{r.supplierName}</Text> },
            { key: "purchases", header: "Total Purchases", align: "right", render: (r) => <Text size="sm">{r.totalPurchases}</Text> },
            { key: "paid", header: "Paid", align: "right", render: (r) => <MoneyText value={r.paidAmount} /> },
            {
              key: "remaining",
              header: "Remaining",
              align: "right",
              render: (r) => (
                <Text size="sm" c={Number(r.remainingAmount) > 0 ? "red" : undefined}>
                  <MoneyText value={r.remainingAmount} />
                </Text>
              ),
            },
          ]}
        />
      </Card>

      <Card shadow="sm" radius="md" withBorder padding={0}>
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
          <Text fw={600}>Purchase History</Text>
          <ExportMenu reportType="suppliers/payments" />
        </Group>
        <DataTable
          data={purchases ?? []}
          isLoading={purchasesLoading}
          keyExtractor={(row) => row.supplierId}
          emptyTitle="No purchase history."
          columns={[
            { key: "supplier", header: "Supplier", render: (r) => <Text size="sm" fw={500}>{r.supplierName}</Text> },
            { key: "purchases", header: "Purchases", align: "right", render: (r) => <Text size="sm">{r.purchaseCount}</Text> },
            { key: "total", header: "Total", align: "right", render: (r) => <MoneyText value={r.totalAmount} /> },
          ]}
        />
      </Card>
    </SimpleGrid>
  );
}
