import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

// Shared date-range shape used by nearly every report filter.
export interface DateRangeInput {
  startDate?: Date;
  endDate?: Date;
}

function dateRangeWhere(input: DateRangeInput): Prisma.DateTimeFilter | undefined {
  if (!input.startDate && !input.endDate) return undefined;
  return { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) };
}

// =====================================================================
// Returns — subtracted from every sales figure below
// =====================================================================

/**
 * Returns of non-cancelled sales, dated by when the goods came back (the
 * usual accounting rule: a return reduces sales in the period it happens,
 * not the period of the original sale). refundAmount is the value of the
 * goods returned — what the customer had been charged for them. Cancelled
 * sales are skipped: they're already excluded from sales entirely.
 */
async function findReturns(shopId: string, range: Prisma.DateTimeFilter | undefined, saleWhere: Prisma.SaleWhereInput = {}) {
  return prisma.salesReturn.findMany({
    where: { shopId, ...(range ? { returnDate: range } : {}), sale: { isCancelled: false, ...saleWhere } },
    select: {
      returnDate: true,
      refundAmount: true,
      sale: { select: { cashierId: true, customerId: true } },
    },
  });
}

/**
 * Per-product returned quantity, value and cost, for the product and
 * profit reports. Each unit's value is what the customer was charged for it
 * on that sale (line + invoice discounts spread across the lines).
 */
async function findReturnedProducts(shopId: string, range: Prisma.DateTimeFilter | undefined) {
  const items = await prisma.salesReturnItem.findMany({
    where: { shopId, salesReturn: { ...(range ? { returnDate: range } : {}), sale: { isCancelled: false } } },
    select: {
      productId: true,
      quantity: true,
      product: { select: { purchasePrice: true } },
      salesReturn: { select: { sale: { select: { totalAmount: true, items: { select: { productId: true, quantity: true, lineTotal: true } } } } } },
    },
  });

  const byProduct = new Map<string, { quantity: number; value: number; cost: number }>();
  for (const item of items) {
    const sale = item.salesReturn.sale;
    const sumLineTotals = sale.items.reduce((sum, line) => sum + Number(line.lineTotal), 0);
    const factor = sumLineTotals > 0 ? Number(sale.totalAmount) / sumLineTotals : 0;
    const lines = sale.items.filter((line) => line.productId === item.productId);
    const lineQty = lines.reduce((sum, line) => sum + line.quantity, 0);
    const unitValue = lineQty > 0 ? (lines.reduce((sum, line) => sum + Number(line.lineTotal), 0) * factor) / lineQty : 0;

    const row = byProduct.get(item.productId) ?? { quantity: 0, value: 0, cost: 0 };
    row.quantity += item.quantity;
    row.value += item.quantity * unitValue;
    row.cost += item.quantity * Number(item.product.purchasePrice);
    byProduct.set(item.productId, row);
  }
  return byProduct;
}

const sumRefunds = (returns: { refundAmount: Prisma.Decimal }[]) => returns.reduce((sum, r) => sum + Number(r.refundAmount), 0);

// =====================================================================
// Chapter 45 – Sales Reports
// =====================================================================

export interface SalesSummaryInput extends DateRangeInput {
  employeeId?: string;
  customerId?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "UNPAID";
}

/** GET /api/v1/reports/sales/summary (45.1). */
export async function getSalesSummary(shopId: string, input: SalesSummaryInput) {
  const range = dateRangeWhere(input);
  const where: Prisma.SaleWhereInput = {
    shopId,
    isCancelled: false,
    ...(range ? { saleDate: range } : {}),
    ...(input.employeeId ? { cashierId: input.employeeId } : {}),
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
  };

  const [agg, returns] = await Promise.all([
    prisma.sale.aggregate({ where, _sum: { totalAmount: true }, _count: { id: true } }),
    findReturns(shopId, range, {
      ...(input.employeeId ? { cashierId: input.employeeId } : {}),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
    }),
  ]);
  const grossSales = Number(agg._sum.totalAmount ?? 0);
  const totalReturns = sumRefunds(returns);
  const totalSales = grossSales - totalReturns;
  const totalInvoices = agg._count.id;

  return {
    totalSales,
    grossSales,
    totalReturns,
    totalInvoices,
    averageSale: totalInvoices > 0 ? Math.round((totalSales / totalInvoices) * 100) / 100 : 0,
  };
}

/**
 * GET /api/v1/reports/sales/daily (45.2). "Cash sales" / "Credit sales"
 * (DDD has no such split) are read from dueAmount — fully paid at sale time
 * counts as cash, anything left owing counts as credit, matching how the
 * rest of this system already treats dueAmount as the credit signal (e.g.
 * Payment Management's Outstanding Balance).
 */
export async function getDailySalesReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, isCancelled: false, ...(range ? { saleDate: range } : {}) },
      select: { saleDate: true, totalAmount: true, dueAmount: true },
    }),
    findReturns(shopId, range),
  ]);

  // totalSales is net of that day's returns; cash/credit stay the day's
  // gross invoice split.
  const emptyRow = () => ({ invoices: 0, totalSales: 0, cashSales: 0, creditSales: 0, returns: 0 });
  const byDay = new Map<string, ReturnType<typeof emptyRow>>();
  for (const sale of sales) {
    const key = sale.saleDate.toISOString().slice(0, 10);
    const row = byDay.get(key) ?? emptyRow();
    row.invoices += 1;
    row.totalSales += Number(sale.totalAmount);
    if (Number(sale.dueAmount) > 0) row.creditSales += Number(sale.totalAmount);
    else row.cashSales += Number(sale.totalAmount);
    byDay.set(key, row);
  }
  for (const ret of returns) {
    const key = ret.returnDate.toISOString().slice(0, 10);
    const row = byDay.get(key) ?? emptyRow();
    row.returns += Number(ret.refundAmount);
    row.totalSales -= Number(ret.refundAmount);
    byDay.set(key, row);
  }

  return Array.from(byDay.entries())
    .map(([date, row]) => ({ date, ...row }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * GET /api/v1/reports/sales/products (45.3). "Profit" uses the product's
 * current purchasePrice as a cost proxy — the schema doesn't snapshot a
 * per-sale unit cost, so this can't reconstruct true historical COGS (same
 * simplification Financial Reports' Profit & Loss makes below).
 */
export async function getProductSalesReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const [items, returned] = await Promise.all([
    prisma.saleItem.findMany({
      where: { sale: { shopId, isCancelled: false, ...(range ? { saleDate: range } : {}) } },
      select: { productId: true, quantity: true, lineTotal: true, product: { select: { productName: true, purchasePrice: true } } },
    }),
    findReturnedProducts(shopId, range),
  ]);

  const byProduct = new Map<string, { name: string; quantitySold: number; revenue: number; cost: number }>();
  for (const item of items) {
    const row = byProduct.get(item.productId) ?? { name: item.product.productName, quantitySold: 0, revenue: 0, cost: 0 };
    row.quantitySold += item.quantity;
    row.revenue += Number(item.lineTotal);
    row.cost += item.quantity * Number(item.product.purchasePrice);
    byProduct.set(item.productId, row);
  }
  // Returned units come back off quantity, revenue and cost. A product
  // returned in this period but sold in an earlier one only appears if it
  // also sold in this period — its return still counts in the totals reports.
  for (const [productId, ret] of returned) {
    const row = byProduct.get(productId);
    if (!row) continue;
    row.quantitySold -= ret.quantity;
    row.revenue -= ret.value;
    row.cost -= ret.cost;
  }

  return Array.from(byProduct.entries())
    .map(([productId, row]) => ({
      productId,
      productName: row.name,
      quantitySold: row.quantitySold,
      revenue: row.revenue,
      profit: row.revenue - row.cost,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** GET /api/v1/reports/sales/employees (45.4). */
export async function getEmployeeSalesReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, isCancelled: false, cashierId: { not: null }, ...(range ? { saleDate: range } : {}) },
      select: { totalAmount: true, cashier: { select: { id: true, username: true } } },
    }),
    findReturns(shopId, range, { cashierId: { not: null } }),
  ]);

  const byEmployee = new Map<string, { name: string; totalSales: number; transactions: number }>();
  for (const sale of sales) {
    if (!sale.cashier) continue;
    const row = byEmployee.get(sale.cashier.id) ?? { name: sale.cashier.username, totalSales: 0, transactions: 0 };
    row.totalSales += Number(sale.totalAmount);
    row.transactions += 1;
    byEmployee.set(sale.cashier.id, row);
  }
  // A return comes off the total of the cashier who made the original sale.
  for (const ret of returns) {
    const row = ret.sale.cashierId ? byEmployee.get(ret.sale.cashierId) : undefined;
    if (row) row.totalSales -= Number(ret.refundAmount);
  }

  return Array.from(byEmployee.entries())
    .map(([employeeId, row]) => ({ employeeId, employeeName: row.name, totalSales: row.totalSales, transactions: row.transactions }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

// =====================================================================
// Chapter 46 – Purchase Reports
// =====================================================================

/** GET /api/v1/reports/purchases/summary (46.1). */
export async function getPurchaseSummary(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const where: Prisma.PurchaseWhereInput = { shopId, ...(range ? { purchaseDate: range } : {}) };

  const [agg, supplierIds, pendingPayments] = await Promise.all([
    prisma.purchase.aggregate({ where, _sum: { totalAmount: true }, _count: { id: true } }),
    prisma.purchase.findMany({ where, select: { supplierId: true }, distinct: ["supplierId"] }),
    prisma.purchase.count({ where: { ...where, paymentStatus: { not: "PAID" } } }),
  ]);

  return {
    totalPurchases: agg._count.id,
    totalAmount: Number(agg._sum.totalAmount ?? 0),
    supplierCount: supplierIds.length,
    pendingPayments,
  };
}

/** GET /api/v1/reports/purchases/suppliers (46.2). */
export async function getSupplierPurchaseReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const purchases = await prisma.purchase.findMany({
    where: { shopId, ...(range ? { purchaseDate: range } : {}) },
    select: { totalAmount: true, supplier: { select: { id: true, supplierName: true, outstandingBalance: true } } },
  });

  const bySupplier = new Map<string, { name: string; purchaseCount: number; totalAmount: number; outstandingBalance: number }>();
  for (const purchase of purchases) {
    const row = bySupplier.get(purchase.supplier.id) ?? {
      name: purchase.supplier.supplierName,
      purchaseCount: 0,
      totalAmount: 0,
      outstandingBalance: Number(purchase.supplier.outstandingBalance),
    };
    row.purchaseCount += 1;
    row.totalAmount += Number(purchase.totalAmount);
    bySupplier.set(purchase.supplier.id, row);
  }

  return Array.from(bySupplier.entries()).map(([supplierId, row]) => ({ supplierId, supplierName: row.name, ...row }));
}

// =====================================================================
// Chapter 47 – Inventory Reports
// =====================================================================

/** GET /api/v1/reports/inventory/stock (47.1). */
export async function getStockReport(shopId: string) {
  const inventory = await prisma.inventory.findMany({
    where: { shopId },
    select: {
      availableQuantity: true,
      product: { select: { id: true, sku: true, productName: true, purchasePrice: true } },
    },
    orderBy: { product: { productName: "asc" } },
  });

  return inventory.map((inv) => ({
    productId: inv.product.id,
    sku: inv.product.sku,
    productName: inv.product.productName,
    availableQuantity: inv.availableQuantity,
    purchasePrice: inv.product.purchasePrice,
    stockValue: inv.availableQuantity * Number(inv.product.purchasePrice),
  }));
}

/** GET /api/v1/reports/inventory/low-stock (47.2) — "Current Stock <= Minimum Stock Level." */
export async function getLowStockReport(shopId: string) {
  const inventory = await prisma.inventory.findMany({
    where: { shopId },
    select: {
      quantity: true,
      reorderLevel: true,
      product: { select: { id: true, sku: true, productName: true } },
    },
  });

  return inventory
    .filter((inv) => inv.quantity <= inv.reorderLevel)
    .map((inv) => ({
      productId: inv.product.id,
      sku: inv.product.sku,
      productName: inv.product.productName,
      currentStock: inv.quantity,
      reorderLevel: inv.reorderLevel,
    }));
}

export interface StockMovementInput extends DateRangeInput {
  productId?: string;
}

/** GET /api/v1/reports/inventory/movement (47.3). */
export async function getStockMovementReport(shopId: string, input: StockMovementInput) {
  const range = dateRangeWhere(input);
  const transactions = await prisma.inventoryTransaction.findMany({
    where: {
      shopId,
      ...(input.productId ? { productId: input.productId } : {}),
      ...(range ? { createdAt: range } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      transactionType: true,
      quantity: true,
      referenceNumber: true,
      createdAt: true,
      product: { select: { id: true, sku: true, productName: true } },
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    productId: tx.product.id,
    sku: tx.product.sku,
    productName: tx.product.productName,
    type: tx.transactionType,
    quantity: tx.quantity,
    referenceNumber: tx.referenceNumber,
    date: tx.createdAt,
  }));
}

const IMEI_STATUS_VALUES = ["AVAILABLE", "RESERVED", "SOLD", "RETURNED", "UNDER_REPAIR", "REPLACED"] as const;
type ImeiStatusValue = (typeof IMEI_STATUS_VALUES)[number];

/**
 * GET /api/v1/reports/inventory/imei (47.4). Warranty status is derived
 * from ImeiNumber's own warrantyEnd (set when a sale creates a warranty —
 * see sale.service.ts) rather than joining the Warranty table, since a
 * CANCELLED warranty still leaves warrantyEnd set; ACTIVE/EXPIRED here just
 * means "within/outside the warranty window," matching what this report
 * needs without an extra query.
 */
export async function getImeiReport(shopId: string, input: { productId?: string; status?: ImeiStatusValue } = {}) {
  const imeis = await prisma.imeiNumber.findMany({
    where: {
      shopId,
      ...(input.productId ? { productId: input.productId } : {}),
      ...(input.status ? { status: input.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      imeiNumber: true,
      status: true,
      warrantyEnd: true,
      product: { select: { id: true, sku: true, productName: true } },
      purchase: { select: { purchaseDate: true } },
    },
  });

  return imeis.map((imei) => ({
    imei: imei.imeiNumber,
    productId: imei.product.id,
    sku: imei.product.sku,
    productName: imei.product.productName,
    purchaseDate: imei.purchase?.purchaseDate ?? null,
    saleStatus: imei.status,
    warrantyStatus: imei.warrantyEnd ? (imei.warrantyEnd > new Date() ? "ACTIVE" : "EXPIRED") : null,
  }));
}

// =====================================================================
// Chapter 48 – Financial Reports
// =====================================================================

/**
 * GET /api/v1/reports/financial/profit-loss (48.1). "Profit = Sales Revenue
 * - (Product Cost + Expenses)" per the doc's own formula. Product Cost uses
 * the same purchasePrice-as-COGS-proxy simplification as the Product Sales
 * Report above.
 */
export async function getProfitLossReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const saleWhere: Prisma.SaleWhereInput = { shopId, isCancelled: false, ...(range ? { saleDate: range } : {}) };

  const [salesAgg, saleItems, expensesAgg, returns, returned] = await Promise.all([
    prisma.sale.aggregate({ where: saleWhere, _sum: { totalAmount: true } }),
    prisma.saleItem.findMany({
      where: { sale: saleWhere },
      select: { quantity: true, product: { select: { purchasePrice: true } } },
    }),
    prisma.expense.aggregate({
      where: { shopId, ...(range ? { expenseDate: range } : {}) },
      _sum: { amount: true },
    }),
    findReturns(shopId, range),
    findReturnedProducts(shopId, range),
  ]);

  // Returned goods are neither revenue nor cost — they're back on the shelf.
  const totalSales = Number(salesAgg._sum.totalAmount ?? 0) - sumRefunds(returns);
  const returnedCost = [...returned.values()].reduce((sum, row) => sum + row.cost, 0);
  const costOfGoodsSold =
    saleItems.reduce((sum, item) => sum + item.quantity * Number(item.product.purchasePrice), 0) - returnedCost;
  const expenses = Number(expensesAgg._sum.amount ?? 0);

  return {
    totalSales,
    costOfGoodsSold,
    expenses,
    netProfit: totalSales - costOfGoodsSold - expenses,
  };
}

/** GET /api/v1/reports/financial/expenses (48.2). */
export async function getExpenseReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const expenses = await prisma.expense.findMany({
    where: { shopId, ...(range ? { expenseDate: range } : {}) },
    orderBy: { expenseDate: "desc" },
    select: {
      id: true,
      amount: true,
      expenseDate: true,
      category: { select: { categoryName: true } },
      recordedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return expenses.map((expense) => ({
    id: expense.id,
    category: expense.category.categoryName,
    amount: expense.amount,
    date: expense.expenseDate,
    employee: expense.recordedBy ? [expense.recordedBy.firstName, expense.recordedBy.lastName].filter(Boolean).join(" ") : null,
  }));
}

const CASH_INFLOW_TYPES = new Set(["OPENING_BALANCE", "SALE", "CASH_IN"]);
const CASH_OUTFLOW_TYPES = new Set(["REFUND", "EXPENSE", "CASH_OUT"]);

/** GET /api/v1/reports/financial/cash-flow (48.3) — across all cash drawer sessions. */
export async function getCashFlowReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const transactions = await prisma.cashDrawerTransaction.findMany({
    where: { shopId, ...(range ? { createdAt: range } : {}) },
    select: { transactionType: true, amount: true },
  });

  let cashIn = 0;
  let cashOut = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (CASH_INFLOW_TYPES.has(tx.transactionType)) cashIn += amount;
    else if (CASH_OUTFLOW_TYPES.has(tx.transactionType)) cashOut += amount;
  }

  return { cashIn, cashOut, currentBalance: cashIn - cashOut };
}

// =====================================================================
// Chapter 49 – Customer Reports
// =====================================================================

/** GET /api/v1/reports/customers/purchases (49.1). */
export async function getCustomerPurchaseReport(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, isCancelled: false, customerId: { not: null }, ...(range ? { saleDate: range } : {}) },
      select: { totalAmount: true, saleDate: true, customer: { select: { id: true, firstName: true, lastName: true } } },
    }),
    findReturns(shopId, range, { customerId: { not: null } }),
  ]);

  const byCustomer = new Map<string, { name: string; totalPurchases: number; totalAmount: number; lastPurchaseDate: Date }>();
  for (const sale of sales) {
    if (!sale.customer) continue;
    const existing = byCustomer.get(sale.customer.id);
    const name = [sale.customer.firstName, sale.customer.lastName].filter(Boolean).join(" ");
    if (existing) {
      existing.totalPurchases += 1;
      existing.totalAmount += Number(sale.totalAmount);
      if (sale.saleDate > existing.lastPurchaseDate) existing.lastPurchaseDate = sale.saleDate;
    } else {
      byCustomer.set(sale.customer.id, { name, totalPurchases: 1, totalAmount: Number(sale.totalAmount), lastPurchaseDate: sale.saleDate });
    }
  }
  for (const ret of returns) {
    const row = ret.sale.customerId ? byCustomer.get(ret.sale.customerId) : undefined;
    if (row) row.totalAmount -= Number(ret.refundAmount);
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, row]) => ({ customerId, customerName: row.name, ...row }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/** GET /api/v1/reports/customers/balance (49.2). */
export async function getCustomerBalanceReport(shopId: string) {
  const customers = await prisma.customer.findMany({
    where: { shopId, isActive: true },
    select: { id: true, firstName: true, lastName: true, creditLimit: true, outstandingBalance: true },
  });

  const paidSums = await prisma.sale.groupBy({
    by: ["customerId"],
    where: { shopId, isCancelled: false, customerId: { not: null } },
    _sum: { paidAmount: true },
  });
  const paidByCustomer = new Map(paidSums.map((row) => [row.customerId, Number(row._sum.paidAmount ?? 0)]));

  return customers.map((customer) => ({
    customerId: customer.id,
    customerName: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    creditLimit: customer.creditLimit,
    paidAmount: paidByCustomer.get(customer.id) ?? 0,
    remainingBalance: customer.outstandingBalance,
  }));
}

// =====================================================================
// Chapter 50 – Supplier Reports
// =====================================================================

/**
 * GET /api/v1/reports/suppliers/balance (50.1). Purchase (unlike Sale) has
 * no paidAmount column — payments against a purchase only exist as separate
 * Payment rows — so "paid" is summed from there instead of a groupBy.
 */
export async function getSupplierBalanceReport(shopId: string) {
  const [suppliers, purchases, payments] = await Promise.all([
    prisma.supplier.findMany({
      where: { shopId, isActive: true },
      select: { id: true, supplierName: true, outstandingBalance: true },
    }),
    prisma.purchase.findMany({ where: { shopId }, select: { id: true, supplierId: true, totalAmount: true } }),
    prisma.payment.findMany({
      where: { shopId, paymentType: "PURCHASE_PAYMENT" },
      select: { referenceId: true, amount: true },
    }),
  ]);

  const supplierIdByPurchaseId = new Map(purchases.map((p) => [p.id, p.supplierId]));
  const totalBySupplier = new Map<string, number>();
  for (const purchase of purchases) {
    totalBySupplier.set(purchase.supplierId, (totalBySupplier.get(purchase.supplierId) ?? 0) + Number(purchase.totalAmount));
  }
  const paidBySupplier = new Map<string, number>();
  for (const payment of payments) {
    const supplierId = supplierIdByPurchaseId.get(payment.referenceId);
    if (!supplierId) continue;
    paidBySupplier.set(supplierId, (paidBySupplier.get(supplierId) ?? 0) + Number(payment.amount));
  }

  return suppliers.map((supplier) => ({
    supplierId: supplier.id,
    supplierName: supplier.supplierName,
    totalPurchases: totalBySupplier.get(supplier.id) ?? 0,
    paidAmount: paidBySupplier.get(supplier.id) ?? 0,
    remainingAmount: supplier.outstandingBalance,
  }));
}

/** GET /api/v1/reports/suppliers/payments (50.2). */
export async function getSupplierPaymentHistory(shopId: string, input: DateRangeInput) {
  const range = dateRangeWhere(input);
  const purchases = await prisma.purchase.findMany({
    where: { shopId },
    select: { id: true, purchaseNumber: true, supplier: { select: { id: true, supplierName: true } } },
  });
  const purchaseById = new Map(purchases.map((p) => [p.id, p]));

  const payments = await prisma.payment.findMany({
    where: {
      shopId,
      paymentType: "PURCHASE_PAYMENT",
      referenceId: { in: purchases.map((p) => p.id) },
      ...(range ? { paymentDate: range } : {}),
    },
    orderBy: { paymentDate: "desc" },
  });

  return payments
    .map((payment) => {
      const purchase = purchaseById.get(payment.referenceId);
      if (!purchase) return null;
      return {
        supplierId: purchase.supplier.id,
        supplierName: purchase.supplier.supplierName,
        purchaseNumber: purchase.purchaseNumber,
        amount: payment.amount,
        method: payment.paymentMethod,
        date: payment.paymentDate,
      };
    })
    .filter((row) => row !== null);
}
