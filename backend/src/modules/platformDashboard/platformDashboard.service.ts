import { prisma } from "../../config/prisma.js";

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** GET /api/v1/admin/dashboard/summary (spec §35). */
export async function getPlatformDashboardSummary() {
  const monthStart = startOfMonth();
  const now = Date.now();

  const [statusCounts, totalUsers, revenueAgg, trialSubscriptions, recentShops] = await Promise.all([
    prisma.shop.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where: { shopId: { not: null } } }),
    prisma.subscription.aggregate({
      where: { createdAt: { gte: monthStart }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    // Each shop accumulates one Subscription row per plan change over time —
    // aggregating Subscription.status directly (instead of via Shop.status,
    // used for the counts above) would double-count a shop that's switched
    // plans. `distinct` picks each trial shop's newest row in one query.
    prisma.subscription.findMany({
      where: { shop: { status: "TRIAL" } },
      orderBy: [{ shopId: "asc" }, { createdAt: "desc" }],
      distinct: ["shopId"],
      select: { shopId: true, endDate: true },
    }),
    prisma.shop.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        owner: { select: { username: true, employee: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;
  const totalShops = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  const expiringTrials = trialSubscriptions.filter(
    (s) => s.endDate && s.endDate.getTime() > now && s.endDate.getTime() - now <= SEVEN_DAYS_MS,
  ).length;

  return {
    totalShops,
    activeShops: countFor("ACTIVE"),
    trialShops: countFor("TRIAL"),
    expiringTrials,
    expiredShops: countFor("EXPIRED"),
    suspendedShops: countFor("SUSPENDED"),
    totalUsers,
    // New Subscription rows created this month with a non-zero amount — not
    // collected/recurring revenue (no billing-cycle automation exists yet),
    // same honesty caveat as the shop dashboard's own simplified P&L figure.
    newSubscriptionRevenueThisMonth: revenueAgg._sum.amount ?? 0,
    recentShops: recentShops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      ownerName: shop.owner
        ? [shop.owner.employee?.firstName, shop.owner.employee?.lastName].filter(Boolean).join(" ") || shop.owner.username
        : null,
      status: shop.status,
      createdAt: shop.createdAt,
    })),
  };
}
