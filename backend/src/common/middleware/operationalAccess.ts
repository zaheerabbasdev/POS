import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prisma.js";
import { getShopId } from "./tenant.js";
import { SubscriptionInactiveError } from "../errors/AppError.js";
import { ErrorCode } from "../constants/errorCodes.js";
import { asyncHandler } from "./asyncHandler.js";
import { logger } from "../logger/logger.js";

/**
 * Blocks the operational (write) routes spec §32 lists once a shop can't
 * currently transact — expired trial, expired/cancelled subscription, or an
 * admin-suspended shop. Read routes, `/auth/*`, `/subscription`, and
 * `/settings` never get this middleware, so an affected shop's owner can
 * still log in, see their data, and go choose a plan.
 *
 * Status is always computed live from the current Subscription's
 * start/end dates and stored `status` — never trusted from a cached column
 * alone (same principle as `Shop.status`'s schema comment and
 * `subscription.service.ts#getCurrentSubscription`). As a side effect, a
 * newly-detected expiry is written back to `Shop`/`Subscription` so the
 * admin's shop list reflects reality without needing a cron job (spec §61)
 * — best-effort, fire-and-forget, same pattern as common/utils/auditLog.ts.
 */
export const requireOperationalAccess = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const shopId = getShopId(req);

    const subscription = await prisma.subscription.findFirst({
      where: { shopId },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      throw new SubscriptionInactiveError(
        "This shop has no active subscription. Please contact support.",
        ErrorCode.SUBSCRIPTION_REQUIRED,
      );
    }

    if (subscription.status === "SUSPENDED") {
      throw new SubscriptionInactiveError(
        "This shop has been suspended. Please contact support.",
        ErrorCode.SHOP_SUSPENDED,
      );
    }

    if (subscription.status === "CANCELLED") {
      throw new SubscriptionInactiveError(
        "This shop's subscription has been cancelled.",
        ErrorCode.SHOP_EXPIRED,
      );
    }

    const isExpiredByDate = subscription.endDate !== null && subscription.endDate.getTime() < Date.now();
    const isExpired = subscription.status === "EXPIRED" || isExpiredByDate;

    if (isExpired) {
      if (isExpiredByDate && subscription.status !== "EXPIRED") {
        // Self-heal the cached status — best-effort, never blocks the request.
        void prisma.$transaction([
          prisma.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } }),
          prisma.shop.update({ where: { id: shopId }, data: { status: "EXPIRED" } }),
        ]).catch((err: unknown) => {
          logger.error({ err, shopId }, "Failed to self-heal expired subscription status");
        });
      }

      const wasTrial = subscription.paymentStatus === "NOT_REQUIRED";
      throw new SubscriptionInactiveError(
        wasTrial
          ? "Your free trial has expired. Choose a plan to keep using the POS."
          : "This shop's subscription has expired. Please renew to continue.",
        wasTrial ? ErrorCode.TRIAL_EXPIRED : ErrorCode.SHOP_EXPIRED,
      );
    }

    next();
  },
);
