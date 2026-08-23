import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as cashDrawerService from "./cashDrawer.service.js";
import type { ListDrawersInput } from "./cashDrawer.service.js";

export const getCurrent = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const drawer = await cashDrawerService.getCurrentDrawer(shopId, req.user.id);
  sendSuccess(res, drawer);
});

export const openDrawer = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { openingBalance: number };
  const drawer = await cashDrawerService.openDrawer(shopId, req.user.id, body.openingBalance);
  sendSuccess(res, drawer, "Cash drawer opened.");
});

export const closeDrawer = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { closingBalance: number; notes?: string };
  const drawer = await cashDrawerService.closeDrawer(shopId, req.user.id, body.closingBalance, body.notes);
  sendSuccess(res, drawer, "Cash drawer closed.");
});

export const cashIn = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { amount: number; remarks?: string };
  const drawer = await cashDrawerService.cashIn(shopId, req.user.id, body.amount, body.remarks);
  sendSuccess(res, drawer, "Cash in recorded.");
});

export const cashOut = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { amount: number; remarks?: string };
  const drawer = await cashDrawerService.cashOut(shopId, req.user.id, body.amount, body.remarks);
  sendSuccess(res, drawer, "Cash out recorded.");
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const query = req.validatedQuery as unknown as { drawerId?: string };
  const summary = await cashDrawerService.getSummary(shopId, req.user.id, query.drawerId);
  sendSuccess(res, summary);
});

export const listDrawers = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await cashDrawerService.listDrawers(shopId, req.validatedQuery as unknown as ListDrawersInput);
  sendPaginated(res, data, pagination);
});
