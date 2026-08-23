import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as warrantyService from "./warranty.service.js";
import type { ListWarrantiesInput } from "./warranty.service.js";

export const listWarranties = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await warrantyService.listWarranties(
    shopId,
    req.validatedQuery as unknown as ListWarrantiesInput,
  );
  sendPaginated(res, data, pagination);
});

export const createWarrantyClaim = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const result = await warrantyService.createWarrantyClaim(shopId, req.body);
  sendSuccess(res, result, "Warranty claim registered and a repair ticket was opened.", HttpStatus.CREATED);
});
