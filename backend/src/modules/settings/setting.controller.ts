import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import * as settingService from "./setting.service.js";

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await settingService.getSettings();
  sendSuccess(res, settings);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const settings = await settingService.updateSettings(req.body, req.user.id);
  sendSuccess(res, settings, "Settings updated successfully.");
});
