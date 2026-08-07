import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import * as purchaseService from "./purchase.service.js";
import type { ListPurchasesInput } from "./purchase.service.js";

export const listPurchases = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await purchaseService.listPurchases(
    req.validatedQuery as unknown as ListPurchasesInput,
  );
  sendPaginated(res, data, pagination);
});

export const getPurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await purchaseService.getPurchaseById(req.params.id as string);
  sendSuccess(res, purchase);
});

export const createPurchase = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const purchase = await purchaseService.createPurchase(req.body, req.user.id);
  sendSuccess(res, purchase, "Purchase created successfully.", HttpStatus.CREATED);
});

export const updatePurchase = asyncHandler(async (req: Request, res: Response) => {
  const purchase = await purchaseService.updatePurchase(req.params.id as string, req.body);
  sendSuccess(res, purchase, "Purchase updated successfully.");
});

export const deletePurchase = asyncHandler(async (req: Request, res: Response) => {
  await purchaseService.deletePurchase(req.params.id as string);
  sendSuccess(res, null, "Purchase deleted successfully.");
});
