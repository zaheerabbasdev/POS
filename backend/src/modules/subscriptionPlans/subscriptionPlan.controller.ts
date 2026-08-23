import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as subscriptionPlanService from "./subscriptionPlan.service.js";

export const listPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await subscriptionPlanService.listPlans();
  sendSuccess(res, plans);
});

export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await subscriptionPlanService.createPlan(req.body);
  sendSuccess(res, plan, "Subscription plan created.", HttpStatus.CREATED);
});

export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const plan = await subscriptionPlanService.updatePlan(req.params.id as string, req.body);
  sendSuccess(res, plan, "Subscription plan updated.");
});
