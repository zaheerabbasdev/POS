import { prisma } from "../../config/prisma.js";
import { NotFoundError } from "../../common/errors/AppError.js";

const planSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  currency: true,
  billingInterval: true,
  durationDays: true,
  isTrial: true,
  isActive: true,
  createdAt: true,
} as const;

/** GET /api/v1/admin/subscription-plans — platform-level reference data, not tenant-scoped. */
export async function listPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: { price: "asc" }, select: planSelect });
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: "MONTHLY" | "YEARLY" | "CUSTOM";
  durationDays: number;
}

/** POST /api/v1/admin/subscription-plans. */
export async function createPlan(input: CreatePlanInput) {
  return prisma.subscriptionPlan.create({
    data: {
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      price: input.price,
      currency: input.currency,
      billingInterval: input.billingInterval,
      durationDays: input.durationDays,
      isTrial: false,
    },
    select: planSelect,
  });
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  billingInterval?: "MONTHLY" | "YEARLY" | "CUSTOM";
  durationDays?: number;
  isActive?: boolean;
}

/** PATCH /api/v1/admin/subscription-plans/{id}. */
export async function updatePlan(id: string, input: UpdatePlanInput) {
  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Subscription plan not found.");

  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.billingInterval !== undefined ? { billingInterval: input.billingInterval } : {}),
      ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: planSelect,
  });
}
