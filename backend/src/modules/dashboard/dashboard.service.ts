import { prisma } from "../../config/prisma.js";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** GET /api/v1/dashboard/summary (API Spec Chapter 44.1). */
export async function getDashboardSummary(shopId: string) {
  const today = startOfToday();
  const monthStart = startOfMonth();

  const [
    todaySalesAgg,
    todayPurchasesAgg,
    monthlySalesAgg,
    totalRevenueAgg,
    totalProducts,
    totalCustomers,
    totalSuppliers,
    pendingPayments,
    recentSales,
    recentPurchases,
    inventoryLevels,
    totalExpensesAgg,
    pendingRepairs,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { shopId, saleDate: { gte: today }, isCancelled: false },
      _sum: { totalAmount: true },
    }),
    prisma.purchase.aggregate({ where: { shopId, purchaseDate: { gte: today } }, _sum: { totalAmount: true } }),
    prisma.sale.aggregate({
      where: { shopId, saleDate: { gte: monthStart }, isCancelled: false },
      _sum: { totalAmount: true },
    }),
    prisma.sale.aggregate({ where: { shopId, isCancelled: false }, _sum: { totalAmount: true } }),
    prisma.product.count({ where: { shopId, isActive: true } }),
    prisma.customer.count({ where: { shopId, isActive: true } }),
    prisma.supplier.count({ where: { shopId, isActive: true } }),
    prisma.sale.count({ where: { shopId, isCancelled: false, dueAmount: { gt: 0 } } }),
    prisma.sale.findMany({
      where: { shopId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        paymentStatus: true,
        saleDate: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.purchase.findMany({
      where: { shopId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        purchaseNumber: true,
        totalAmount: true,
        paymentStatus: true,
        purchaseDate: true,
        supplier: { select: { supplierName: true } },
      },
    }),
    prisma.inventory.findMany({ where: { shopId }, select: { quantity: true, reorderLevel: true } }),
    prisma.expense.aggregate({ where: { shopId }, _sum: { amount: true } }),
    prisma.repair.count({ where: { shopId, repairStatus: { notIn: ["DELIVERED", "CANCELLED"] } } }),
  ]);

  const lowStockProducts = inventoryLevels.filter((inv) => inv.quantity > 0 && inv.quantity <= inv.reorderLevel).length;
  const outOfStockProducts = inventoryLevels.filter((inv) => inv.quantity <= 0).length;

  const totalRevenue = totalRevenueAgg._sum.totalAmount ?? 0;
  const totalExpenses = totalExpensesAgg._sum.amount ?? 0;

  return {
    todaySales: todaySalesAgg._sum.totalAmount ?? 0,
    todayPurchases: todayPurchasesAgg._sum.totalAmount ?? 0,
    monthlySales: monthlySalesAgg._sum.totalAmount ?? 0,
    totalRevenue,
    totalExpenses,
    // Still simplified (revenue minus recorded expenses) — no per-sale cost
    // of goods sold tracked yet, so this isn't a true COGS-based P&L; the
    // Financial Reports' Profit & Loss endpoint does that properly.
    totalProfit: Number(totalRevenue) - Number(totalExpenses),
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    totalCustomers,
    totalSuppliers,
    pendingPayments,
    pendingRepairs,
    recentSales: recentSales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer ? [sale.customer.firstName, sale.customer.lastName].filter(Boolean).join(" ") : "Walk-in",
      totalAmount: sale.totalAmount,
      status: sale.paymentStatus,
      date: sale.saleDate,
    })),
    recentPurchases: recentPurchases.map((purchase) => ({
      id: purchase.id,
      purchaseNumber: purchase.purchaseNumber,
      supplier: purchase.supplier.supplierName,
      totalAmount: purchase.totalAmount,
      status: purchase.paymentStatus,
      date: purchase.purchaseDate,
    })),
  };
}
