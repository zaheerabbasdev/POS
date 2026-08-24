import { prisma } from "../../config/prisma.js";

function ownerName(owner: { username: string; employee: { firstName: string; lastName: string | null } | null } | null): string | null {
  if (!owner) return null;
  if (!owner.employee) return owner.username;
  return [owner.employee.firstName, owner.employee.lastName].filter(Boolean).join(" ") || owner.username;
}

/**
 * GET /api/v1/admin/reports/shops-performance — every shop's lifetime sales/
 * purchase totals + current plan. Same aggregation style as
 * dashboard.service.ts/platformDashboard.service.ts (Postgres does the
 * summing, not Node) with a small in-memory join across the results — an
 * acceptable pattern at this scale, same as platformDashboard.service.ts's
 * own recent-shops join.
 */
export async function getShopsPerformance() {
  const [shops, salesByShop, purchasesByShop, currentSubscriptions] = await Promise.all([
    prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        owner: { select: { username: true, employee: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.sale.groupBy({ by: ["shopId"], where: { isCancelled: false }, _sum: { totalAmount: true } }),
    prisma.purchase.groupBy({ by: ["shopId"], _sum: { totalAmount: true } }),
    // Each shop accumulates one Subscription row per plan change — distinct
    // picks each shop's newest row, same pattern platformDashboard.service.ts
    // already established (and for the same double-counting reason).
    prisma.subscription.findMany({
      orderBy: [{ shopId: "asc" }, { createdAt: "desc" }],
      distinct: ["shopId"],
      select: { shopId: true, plan: { select: { name: true } } },
    }),
  ]);

  const salesMap = new Map(salesByShop.map((s) => [s.shopId, s._sum.totalAmount ?? 0]));
  const purchasesMap = new Map(purchasesByShop.map((p) => [p.shopId, p._sum.totalAmount ?? 0]));
  const planMap = new Map(currentSubscriptions.map((s) => [s.shopId, s.plan.name]));

  return shops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    ownerName: ownerName(shop.owner),
    status: shop.status,
    planName: planMap.get(shop.id) ?? null,
    totalSales: salesMap.get(shop.id) ?? 0,
    totalPurchases: purchasesMap.get(shop.id) ?? 0,
  }));
}

/**
 * GET /api/v1/admin/reports/subscription-overview — per-plan breakdown.
 * "Shops currently on this plan" needs the same distinct-latest-per-shop
 * treatment as above (a shop's history shouldn't inflate another plan's
 * count); lifetime revenue is a plain sum across all Subscription rows for
 * that plan — additive across a shop's whole history, not a "current state"
 * figure, so no distinct needed there.
 */
export async function getSubscriptionOverview() {
  const [plans, currentSubscriptions, revenueByPlan] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { price: "asc" } }),
    prisma.subscription.findMany({
      orderBy: [{ shopId: "asc" }, { createdAt: "desc" }],
      distinct: ["shopId"],
      select: { planId: true },
    }),
    prisma.subscription.groupBy({ by: ["planId"], _sum: { amount: true } }),
  ]);

  const currentShopCountByPlan = new Map<string, number>();
  for (const sub of currentSubscriptions) {
    currentShopCountByPlan.set(sub.planId, (currentShopCountByPlan.get(sub.planId) ?? 0) + 1);
  }
  const revenueMap = new Map(revenueByPlan.map((r) => [r.planId, r._sum.amount ?? 0]));

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    isTrial: plan.isTrial,
    isActive: plan.isActive,
    price: plan.price,
    currency: plan.currency,
    shopsCurrentlyOnPlan: currentShopCountByPlan.get(plan.id) ?? 0,
    lifetimeRevenue: revenueMap.get(plan.id) ?? 0,
  }));
}
