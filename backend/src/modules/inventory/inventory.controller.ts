import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import * as inventoryService from "./inventory.service.js";
import type { ListInventoryInput } from "./inventory.service.js";

export const listInventory = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await inventoryService.listInventory(
    req.validatedQuery as unknown as ListInventoryInput,
  );
  sendPaginated(res, data, pagination);
});

export const getStockHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await inventoryService.getStockHistory(req.params.productId as string);
  sendSuccess(res, history);
});

export const createAdjustment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const inventory = await inventoryService.createAdjustment(req.body, req.user.id);
  sendSuccess(res, inventory, "Stock adjustment recorded successfully.");
});
