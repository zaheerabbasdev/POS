import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as salesReturnService from "./salesReturn.service.js";
import type { ListSalesReturnsInput } from "./salesReturn.service.js";

export const listSalesReturns = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await salesReturnService.listSalesReturns(
    shopId,
    req.validatedQuery as unknown as ListSalesReturnsInput,
  );
  sendPaginated(res, data, pagination);
});

export const createSalesReturn = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const salesReturn = await salesReturnService.createSalesReturn(shopId, req.body, req.user.id);
  sendSuccess(res, salesReturn, "Sales return processed successfully.", HttpStatus.CREATED);
});
