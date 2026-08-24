import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import * as platformReportService from "./platformReport.service.js";

export const getShopsPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const report = await platformReportService.getShopsPerformance();
  sendSuccess(res, report);
});

export const getSubscriptionOverview = asyncHandler(async (_req: Request, res: Response) => {
  const report = await platformReportService.getSubscriptionOverview();
  sendSuccess(res, report);
});
