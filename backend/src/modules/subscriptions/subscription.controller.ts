import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as subscriptionService from "./subscription.service.js";

export const getCurrentSubscription = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const subscription = await subscriptionService.getCurrentSubscription(shopId);
  sendSuccess(res, subscription);
});

export const listSelectablePlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await subscriptionService.listSelectablePlans();
  sendSuccess(res, plans);
});

export const selectPlan = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { planId } = req.body as { planId: string };
  const subscription = await subscriptionService.selectPlan(shopId, planId);
  sendSuccess(res, subscription, "Plan updated successfully.");
});
