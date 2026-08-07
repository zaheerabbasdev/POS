import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import * as permissionService from "./permission.service.js";

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await permissionService.listPermissions();
  sendSuccess(res, permissions);
});
