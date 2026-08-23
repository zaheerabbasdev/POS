import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import * as platformDashboardService from "./platformDashboard.service.js";

export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await platformDashboardService.getPlatformDashboardSummary();
  sendSuccess(res, summary);
});
