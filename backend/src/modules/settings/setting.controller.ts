import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as settingService from "./setting.service.js";

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const settings = await settingService.getSettings(shopId);
  sendSuccess(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const shopId = getShopId(req);
  const settings = await settingService.updateSettings(shopId, req.body, req.user.id);
  sendSuccess(res, settings, "Settings updated successfully.");
});
