import { prisma } from "../../config/prisma.js";
import type { Prisma, ShopStatus } from "../../generated/prisma/client.js";
import { NotFoundError, BadRequestError } from "../../common/errors/AppError.js";
import { logAudit } from "../../common/utils/auditLog.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { provisionShop } from "../../common/services/provisionShop.js";

const shopListSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  status: true,
  createdAt: true,
  owner: { select: { id: true, username: true, employee: { select: { firstName: true, lastName: true } } } },
  subscriptions: {
    select: { status: true, endDate: true, plan: { select: { name: true, isTrial: true } } },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ShopSelect;

type ShopListRow = Prisma.ShopGetPayload<{ select: typeof shopListSelect }>;

function ownerName(owner: ShopListRow["owner"]): string | null {
  if (!owner) return null;
  if (!owner.employee) return owner.username;
  return [owner.employee.firstName, owner.employee.lastName].filter(Boolean).join(" ") || owner.username;
}

function toShopListItem(shop: ShopListRow) {
  const subscription = shop.subscriptions[0] ?? null;
  const daysRemaining = subscription?.endDate
    ? Math.max(0, Math.ceil((subscription.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return {
    id: shop.id,
    name: shop.name,
    phone: shop.phone,
    email: shop.email,
    status: shop.status,
    ownerName: ownerName(shop.owner),
    ownerUsername: shop.owner?.username ?? null,
    planName: subscription?.plan.name ?? null,
    trialEndDate: subscription?.endDate ?? null,
    daysRemaining,
    createdAt: shop.createdAt,
  };
}

export interface ListShopsInput extends PaginationQuery {
  search?: string;
  status?: ShopStatus;
}

/** GET /api/v1/admin/shops (spec §26-27). */
export async function listShops(input: ListShopsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);

  const where: Prisma.ShopWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { owner: { username: { contains: input.search, mode: "insensitive" } } },
            { owner: { employee: { firstName: { contains: input.search, mode: "insensitive" } } } },
            { owner: { employee: { lastName: { contains: input.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: shopListSelect }),
    prisma.shop.count({ where }),
  ]);

  return { data: shops.map(toShopListItem), pagination: buildPaginationMeta(page, limit, total) };
}

/** GET /api/v1/admin/shops/{id}. */
export async function getShopById(id: string) {
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, username: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } },
    },
  });
  if (!shop) throw new NotFoundError("Shop not found.");

  const subscription = shop.subscriptions[0] ?? null;
  return {
    id: shop.id,
    name: shop.name,
    phone: shop.phone,
    email: shop.email,
    address: shop.address,
    city: shop.city,
    country: shop.country,
    logoUrl: shop.logoUrl,
    status: shop.status,
    createdAt: shop.createdAt,
    owner: shop.owner
      ? { id: shop.owner.id, username: shop.owner.username, email: shop.owner.email, name: ownerName(shop.owner) }
      : null,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          paymentStatus: subscription.paymentStatus,
          plan: { id: subscription.plan.id, name: subscription.plan.name, isTrial: subscription.plan.isTrial },
        }
      : null,
  };
}

export interface CreateShopInput {
  shop: { name: string; phone: string; email?: string; address?: string; city?: string; country?: string };
  owner: { name: string; username: string; email: string; password: string };
}

/** POST /api/v1/admin/shops (spec §21-22) — always grants a 1-month free trial. */
export async function createShop(actorUserId: string, input: CreateShopInput) {
  const result = await provisionShop(input, {
    actorUserId,
    auditAction: "SHOP_CREATED",
    auditDescription: (shopName) => `Shop "${shopName}" created by a Platform Admin.`,
  });
  return getShopById(result.shop.id);
}

export interface UpdateShopInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
}

/** PATCH /api/v1/admin/shops/{id}. */
export async function updateShop(id: string, actorUserId: string, input: UpdateShopInput) {
  const existing = await prisma.shop.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Shop not found.");

  await prisma.shop.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.country !== undefined ? { country: input.country } : {}),
    },
  });

  void logAudit({
    shopId: null,
    userId: actorUserId,
    module: "Platform",
    action: "SHOP_UPDATED",
    description: `Shop "${existing.name}" details updated by a Platform Admin.`,
  });

  return getShopById(id);
}

/** PATCH /api/v1/admin/shops/{id}/suspend (spec §26 action, §33). */
export async function suspendShop(id: string, actorUserId: string) {
  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) throw new NotFoundError("Shop not found.");
  if (shop.status === "CANCELLED") throw new BadRequestError("This shop has been archived and cannot be suspended.");
  if (shop.status === "SUSPENDED") throw new BadRequestError("Shop is already suspended.");

  await prisma.$transaction([
    prisma.shop.update({ where: { id }, data: { status: "SUSPENDED" } }),
    prisma.subscription.updateMany({
      where: { shopId: id, status: { in: ["TRIAL", "ACTIVE", "EXPIRED"] } },
      data: { status: "SUSPENDED" },
    }),
  ]);

  void logAudit({
    shopId: null,
    userId: actorUserId,
    module: "Platform",
    action: "SHOP_SUSPENDED",
    description: `Shop "${shop.name}" suspended by a Platform Admin.`,
  });

  return getShopById(id);
}

/**
 * PATCH /api/v1/admin/shops/{id}/archive (spec §26 action). A permanent close,
 * not a hard delete — matches this app's soft-delete-only convention
 * elsewhere (Product/Employee/User all deactivate rather than remove a row,
 * since a hard delete would violate FK constraints the moment any related
 * row exists — see product.service.ts#deleteProduct's own comment). One-way:
 * `activateShop` never restores from `CANCELLED`, only from `SUSPENDED`/
 * `EXPIRED` — an archived shop stays archived.
 */
export async function archiveShop(id: string, actorUserId: string) {
  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) throw new NotFoundError("Shop not found.");
  if (shop.status === "CANCELLED") throw new BadRequestError("Shop is already archived.");

  await prisma.$transaction([
    prisma.shop.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.subscription.updateMany({
      where: { shopId: id, status: { in: ["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED"] } },
      data: { status: "CANCELLED" },
    }),
  ]);

  void logAudit({
    shopId: null,
    userId: actorUserId,
    module: "Platform",
    action: "SHOP_ARCHIVED",
    description: `Shop "${shop.name}" archived by a Platform Admin.`,
  });

  return getShopById(id);
}

/** PATCH /api/v1/admin/shops/{id}/activate. */
export async function activateShop(id: string, actorUserId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!shop) throw new NotFoundError("Shop not found.");
  if (shop.status === "CANCELLED") {
    throw new BadRequestError("This shop has been archived and cannot be reactivated.");
  }

  const subscription = shop.subscriptions[0] ?? null;
  const stillWithinTerm = subscription?.endDate ? subscription.endDate.getTime() > Date.now() : false;
  // If the subscription still has time left (and wasn't cancelled), restore
  // it to TRIAL — this app's only current plans (Free Trial, Legacy Access)
  // are both non-paid, so there's no distinct "paid and active" case to
  // restore into yet; otherwise fall back to a plain ACTIVE shop with no
  // usable term (the owner will need a plan from the subscription page).
  const restoredStatus: ShopStatus = stillWithinTerm && subscription?.status !== "CANCELLED" ? "TRIAL" : "ACTIVE";

  await prisma.$transaction([
    prisma.shop.update({ where: { id }, data: { status: restoredStatus } }),
    ...(subscription
      ? [
          prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: restoredStatus },
          }),
        ]
      : []),
  ]);

  void logAudit({
    shopId: null,
    userId: actorUserId,
    module: "Platform",
    action: "SHOP_ACTIVATED",
    description: `Shop "${shop.name}" reactivated by a Platform Admin.`,
  });

  return getShopById(id);
}

export interface ExtendTrialInput {
  days: number;
  reason: string;
}

/** POST /api/v1/admin/shops/{id}/extend-trial (spec §23-25). */
export async function extendTrial(id: string, actorUserId: string, input: ExtendTrialInput) {
  const shop = await prisma.shop.findUnique({ where: { id } });
  if (!shop) throw new NotFoundError("Shop not found.");

  const subscription = await prisma.subscription.findFirst({ where: { shopId: id }, orderBy: { createdAt: "desc" } });
  if (!subscription) throw new NotFoundError("This shop has no subscription to extend.");

  const now = new Date();
  const previousEndDate = subscription.endDate;
  const wasExpired = subscription.endDate !== null && subscription.endDate.getTime() <= now.getTime();
  // Spec §24: extend from the current end date if still active; never create
  // an already-expired extension — an expired subscription extends from now.
  const base = wasExpired || !subscription.endDate ? now : subscription.endDate;
  const newEndDate = new Date(base.getTime() + input.days * 24 * 60 * 60 * 1000);

  // Extending a trial doesn't un-suspend an explicitly suspended shop (that's
  // a separate admin action); otherwise an expired subscription comes back
  // as TRIAL now that it has time remaining, and an already-active one keeps
  // its current status unchanged.
  const newSubscriptionStatus: typeof subscription.status =
    subscription.status === "SUSPENDED" ? "SUSPENDED" : subscription.status === "EXPIRED" || wasExpired ? "TRIAL" : subscription.status;
  // ShopStatus and SubscriptionStatus are separate Prisma enums that happen to
  // share every value this function ever produces except SubscriptionStatus's
  // unused PAST_DUE (never set anywhere in this app) — safe to reuse directly.
  const newShopStatus: ShopStatus =
    shop.status === "SUSPENDED" ? "SUSPENDED" : shop.status === "EXPIRED" ? (newSubscriptionStatus as ShopStatus) : shop.status;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { endDate: newEndDate, status: newSubscriptionStatus },
    });
    await tx.shop.update({ where: { id }, data: { status: newShopStatus } });
    await tx.subscriptionHistory.create({
      data: {
        shopId: id,
        planId: subscription.planId,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: newEndDate,
        amount: subscription.amount,
        paymentStatus: subscription.paymentStatus,
        changeReason: input.reason,
        createdById: actorUserId,
      },
    });
    await tx.auditLog.create({
      data: {
        shopId: null,
        userId: actorUserId,
        module: "Platform",
        action: "TRIAL_EXTENDED",
        description:
          `Trial extended for shop "${shop.name}" by ${input.days} day(s). ` +
          `Previous end: ${previousEndDate ? previousEndDate.toISOString() : "none"}. ` +
          `New end: ${newEndDate.toISOString()}. Reason: ${input.reason}`,
      },
    });
  });

  return getShopById(id);
}
