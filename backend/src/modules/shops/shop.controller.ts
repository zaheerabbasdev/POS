import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import * as shopService from "./shop.service.js";
import type { ListShopsInput } from "./shop.service.js";

function requireActorId(req: Request): string {
  if (!req.user) throw new UnauthorizedError();
  return req.user.id;
}

export const listShops = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await shopService.listShops(req.validatedQuery as unknown as ListShopsInput);
  sendPaginated(res, data, pagination);
});

export const getShop = asyncHandler(async (req: Request, res: Response) => {
  const shop = await shopService.getShopById(req.params.id as string);
  sendSuccess(res, shop);
});

export const createShop = asyncHandler(async (req: Request, res: Response) => {
  const actorId = requireActorId(req);
  const shop = await shopService.createShop(actorId, req.body);
  sendSuccess(res, shop, "Shop created successfully.", HttpStatus.CREATED);
});

export const updateShop = asyncHandler(async (req: Request, res: Response) => {
  const actorId = requireActorId(req);
  const shop = await shopService.updateShop(req.params.id as string, actorId, req.body);
  sendSuccess(res, shop, "Shop updated successfully.");
});

export const suspendShop = asyncHandler(async (req: Request, res: Response) => {
  const actorId = requireActorId(req);
  const shop = await shopService.suspendShop(req.params.id as string, actorId);
  sendSuccess(res, shop, "Shop suspended.");
});

export const activateShop = asyncHandler(async (req: Request, res: Response) => {
  const actorId = requireActorId(req);
  const shop = await shopService.activateShop(req.params.id as string, actorId);
  sendSuccess(res, shop, "Shop activated.");
});

export const extendTrial = asyncHandler(async (req: Request, res: Response) => {
  const actorId = requireActorId(req);
  const shop = await shopService.extendTrial(req.params.id as string, actorId, req.body);
  sendSuccess(res, shop, "Trial extended successfully.");
});
