import { prisma } from "../../config/prisma.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";

/**
 * GET /api/v1/subscription — the caller's own shop's current subscription.
 * `daysRemaining` is always computed live from `endDate` (never trusted from
 * a cached field) — same principle as `Shop.status` documented in
 * schema.prisma's Shop model comment and PROJECT_DOCUMENTATION.md §5.0.
 */
export async function getCurrentSubscription(shopId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  if (!subscription) throw new NotFoundError("No subscription found for this shop.");

  const now = Date.now();
  const daysRemaining = subscription.endDate
    ? Math.max(0, Math.ceil((subscription.endDate.getTime() - now) / (24 * 60 * 60 * 1000)))
    : null;
  const isExpired = subscription.endDate ? subscription.endDate.getTime() < now : false;

  return {
    id: subscription.id,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    daysRemaining,
    isExpired,
    paymentStatus: subscription.paymentStatus,
    amount: subscription.amount,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      isTrial: subscription.plan.isTrial,
      price: subscription.plan.price,
      currency: subscription.plan.currency,
      durationDays: subscription.plan.durationDays,
    },
  };
}

/**
 * GET /api/v1/subscription/plans — active, non-trial plans a shop can switch
 * to. Excludes `isTrial` plans (a shop can't self-select back into a trial —
 * that's only ever granted at registration or by a Platform Admin).
 */
export async function listSelectablePlans() {
  return prisma.subscriptionPlan.findMany({
    where: { isActive: true, isTrial: false },
    orderBy: { price: "asc" },
  });
}

/**
 * POST /api/v1/subscription/select-plan — spec §29-30. No payment gateway
 * exists yet (deliberately, per spec §40 — never fake a successful payment),
 * so this is the same kind of manually-managed transition the rest of the
 * app already uses for subscription state (an admin suspending a shop,
 * extending a trial): picking a plan switches the shop onto it immediately;
 * `paymentStatus` records whether real billing collection is still owed.
 */
export async function selectPlan(shopId: string, planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive || plan.isTrial) {
    throw new BadRequestError("This plan is not available for selection.");
  }

  const now = new Date();
  const endDate = plan.durationDays > 0 ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000) : null;
  const paymentStatus = Number(plan.price) > 0 ? "PENDING" : "NOT_REQUIRED";

  await prisma.$transaction([
    prisma.subscription.create({
      data: {
        shopId,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        endDate,
        amount: plan.price,
        paymentStatus,
      },
    }),
    prisma.subscriptionHistory.create({
      data: {
        shopId,
        planId: plan.id,
        status: "ACTIVE",
        startDate: now,
        endDate,
        amount: plan.price,
        paymentStatus,
        changeReason: "Plan changed by shop owner.",
      },
    }),
    prisma.shop.update({ where: { id: shopId }, data: { status: "ACTIVE" } }),
  ]);

  return getCurrentSubscription(shopId);
}
