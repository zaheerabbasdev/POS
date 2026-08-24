import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { hashPassword } from "../utils/password.js";
import { splitName } from "../utils/name.js";
import { generateCode } from "../utils/code.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";
import { DEFAULT_SHOP_ROLES } from "../constants/defaultRoles.js";

export const TRIAL_DURATION_DAYS = 30;
export const FREE_TRIAL_PLAN_NAME = "Free Trial";

export interface ProvisionShopInput {
  shop: {
    name: string;
    phone: string;
    email?: string | undefined;
    address?: string | undefined;
    city?: string | undefined;
    country?: string | undefined;
  };
  owner: {
    name: string;
    username: string;
    email: string;
    password: string;
  };
}

export interface ProvisionShopContext {
  /** null for public self-registration; the acting Platform Admin's user id when admin-created. */
  actorUserId: string | null;
  /** Audit description — differs slightly between "public sign-up" and "created by an admin". */
  auditAction: string;
  auditDescription: (shopName: string) => string;
}

/** Find-or-create the platform-wide "Free Trial" plan (spec §18). */
async function ensureFreeTrialPlan() {
  return prisma.subscriptionPlan.upsert({
    where: { name: FREE_TRIAL_PLAN_NAME },
    update: {},
    create: {
      name: FREE_TRIAL_PLAN_NAME,
      description: "1-month free trial, no payment required.",
      price: 0,
      billingInterval: "CUSTOM",
      durationDays: TRIAL_DURATION_DAYS,
      isTrial: true,
      isActive: true,
    },
  });
}

/**
 * Provisions one shop's own copy of the 6 default roles (mirrors
 * prisma/seed.ts#seedShopRoles, which can't share this function directly —
 * that script deliberately avoids importing the app's Prisma client — but
 * both now read the same role/permission data from
 * common/constants/defaultRoles.ts). Returns the created "Owner" role's id.
 *
 * Fetches every permission this shop's roles could need in one query up
 * front, and creates every role→permission link in one batched call at the
 * end — instead of one `permission.findMany` + one `rolePermission.createMany`
 * per role (was 12 extra round trips for 6 roles). Each interactive
 * transaction only gets 5s by default (`P2028` if exceeded), and every round
 * trip here goes over the network to Postgres — cutting the count matters
 * more than the timeout bump below.
 */
async function provisionShopRoles(tx: Prisma.TransactionClient, shopId: string): Promise<string> {
  const allPermissionNames = [...new Set(DEFAULT_SHOP_ROLES.flatMap((roleDef) => roleDef.permissions))];
  const permissions = await tx.permission.findMany({
    where: { permissionName: { in: allPermissionNames } },
  });
  const permissionIdsByName = new Map(permissions.map((p) => [p.permissionName, p.id]));

  let ownerRoleId: string | null = null;
  const rolePermissionRows: { roleId: string; permissionId: string }[] = [];

  for (const roleDef of DEFAULT_SHOP_ROLES) {
    const role = await tx.role.create({
      data: { shopId, roleName: roleDef.name, description: roleDef.description },
    });
    if (roleDef.name === "Owner") ownerRoleId = role.id;

    for (const permissionName of roleDef.permissions) {
      const permissionId = permissionIdsByName.get(permissionName);
      if (permissionId) rolePermissionRows.push({ roleId: role.id, permissionId });
    }
  }

  if (rolePermissionRows.length > 0) {
    await tx.rolePermission.createMany({ data: rolePermissionRows, skipDuplicates: true });
  }

  if (!ownerRoleId) {
    // Should be unreachable — DEFAULT_SHOP_ROLES always includes "Owner" —
    // but fail loudly rather than silently create an owner with no role.
    throw new NotFoundError("Owner role could not be provisioned.");
  }
  return ownerRoleId;
}

/**
 * The one shop-creation transaction — Shop + its own role set + Owner
 * Employee/User + a 30-day free-trial Subscription/SubscriptionHistory + an
 * audit entry. Shared by public self-registration
 * (modules/registration/registration.service.ts) and admin-created shops
 * (modules/shops/shop.service.ts) so the two flows can never drift.
 */
export async function provisionShop(input: ProvisionShopInput, context: ProvisionShopContext) {
  const existingUsername = await prisma.user.findUnique({ where: { username: input.owner.username } });
  if (existingUsername) throw new ConflictError("Username is already taken.");

  const existingEmail = await prisma.user.findUnique({ where: { email: input.owner.email } });
  if (existingEmail) throw new ConflictError("Email is already registered.");

  const freeTrialPlan = await ensureFreeTrialPlan();

  const hashedPassword = await hashPassword(input.owner.password);
  const { firstName, lastName } = splitName(input.owner.name);

  const now = new Date();
  const trialEndDate = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({
      data: {
        name: input.shop.name,
        phone: input.shop.phone,
        ...(input.shop.email ? { email: input.shop.email } : {}),
        ...(input.shop.address !== undefined ? { address: input.shop.address } : {}),
        ...(input.shop.city !== undefined ? { city: input.shop.city } : {}),
        ...(input.shop.country !== undefined ? { country: input.shop.country } : {}),
        status: "TRIAL",
      },
    });

    const ownerRoleId = await provisionShopRoles(tx, shop.id);

    const employee = await tx.employee.create({
      data: { shopId: shop.id, employeeCode: generateCode("EMP"), firstName, lastName, joiningDate: now },
    });

    const user = await tx.user.create({
      data: {
        shopId: shop.id,
        username: input.owner.username,
        email: input.owner.email,
        password: hashedPassword,
        employeeId: employee.id,
        roles: { create: { roleId: ownerRoleId } },
      },
    });

    await tx.shop.update({ where: { id: shop.id }, data: { ownerId: user.id } });

    const subscription = await tx.subscription.create({
      data: {
        shopId: shop.id,
        planId: freeTrialPlan.id,
        status: "TRIAL",
        startDate: now,
        endDate: trialEndDate,
        amount: 0,
        paymentStatus: "NOT_REQUIRED",
      },
    });

    await tx.subscriptionHistory.create({
      data: {
        shopId: shop.id,
        planId: freeTrialPlan.id,
        status: "TRIAL",
        startDate: now,
        endDate: trialEndDate,
        amount: 0,
        paymentStatus: "NOT_REQUIRED",
        changeReason: "1-month free trial started.",
        ...(context.actorUserId ? { createdById: context.actorUserId } : {}),
      },
    });

    // Platform-level entry (shopId: null) — a new shop coming into existence
    // is a platform event, not something this shop's own (still empty)
    // audit log needs to carry.
    await tx.auditLog.create({
      data: {
        shopId: null,
        userId: context.actorUserId ?? user.id,
        module: "Platform",
        action: context.auditAction,
        description: context.auditDescription(shop.name),
      },
    });

    return { shop, user, subscription, employee, ownerRoleId };
  }, { timeout: 10_000 }); // 5s default is tight for ~15 sequential round trips over a real network (Neon, not localhost) — see provisionShopRoles' own comment for the bigger fix (fewer round trips).
}
