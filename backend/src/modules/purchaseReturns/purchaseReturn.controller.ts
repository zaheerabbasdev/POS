import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as purchaseReturnService from "./purchaseReturn.service.js";
import type { ListPurchaseReturnsInput } from "./purchaseReturn.service.js";

export const listPurchaseReturns = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await purchaseReturnService.listPurchaseReturns(
    shopId,
    req.validatedQuery as unknown as ListPurchaseReturnsInput,
  );
  sendPaginated(res, data, pagination);
});

export const createPurchaseReturn = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const purchaseReturn = await purchaseReturnService.createPurchaseReturn(shopId, req.body, req.user.id);
  sendSuccess(res, purchaseReturn, "Purchase return processed successfully.", HttpStatus.CREATED);
});
