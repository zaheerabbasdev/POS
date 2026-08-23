import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as dashboardService from "./dashboard.service.js";

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const summary = await dashboardService.getDashboardSummary(shopId);
  sendSuccess(res, summary);
});
