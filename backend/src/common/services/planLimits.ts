import { prisma } from "../../config/prisma.js";
import { PlanLimitExceededError } from "../errors/AppError.js";

export type LimitedResource = "users" | "products";

const RESOURCE_LABELS: Record<LimitedResource, string> = {
  users: "users",
  products: "products",
};

/**
 * Guards a create flow against the shop's current subscription plan's
 * resource limit (e.g. `SubscriptionPlan.maxUsers`/`maxProducts`) — a `null`
 * limit means unlimited, matching the schema's own convention (see
 * `PROJECT_DOCUMENTATION.md` §38's plan-limit fields). Call this first thing
 * in a create service function, before any other work, the same way those
 * functions already front-load their uniqueness/ownership checks.
 *
 * Only `users` and `products` are enforced so far — see increment 8's scope
 * note in `PROJECT_DOCUMENTATION.md` §11.9 for why the plan's other limit
 * fields aren't wired in yet.
 */
export async function checkPlanLimit(shopId: string, resource: LimitedResource): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: { plan: { select: { maxUsers: true, maxProducts: true, name: true } } },
  });
  // No subscription row at all is handled elsewhere (requireOperationalAccess
  // blocks writes entirely in that case) — nothing to enforce here if so.
  if (!subscription) return;

  const limit = resource === "users" ? subscription.plan.maxUsers : subscription.plan.maxProducts;
  if (limit === null) return;

  const currentCount =
    resource === "users"
      ? await prisma.user.count({ where: { shopId, isActive: true } })
      : await prisma.product.count({ where: { shopId, isActive: true } });

  if (currentCount >= limit) {
    throw new PlanLimitExceededError(
      `Your "${subscription.plan.name}" plan allows up to ${limit} ${RESOURCE_LABELS[resource]}. ` +
        `Choose a higher plan from your Subscription page to add more.`,
    );
  }
}
