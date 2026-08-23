import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as productModelService from "./productModel.service.js";
import type { ListProductModelsInput } from "./productModel.service.js";

export const listProductModels = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await productModelService.listProductModels(
    shopId,
    req.validatedQuery as unknown as ListProductModelsInput,
  );
  sendPaginated(res, data, pagination);
});

export const getProductModel = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const model = await productModelService.getProductModelById(shopId, req.params.id as string);
  sendSuccess(res, model);
});

export const createProductModel = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const model = await productModelService.createProductModel(shopId, req.body);
  sendSuccess(res, model, "Model created successfully.", HttpStatus.CREATED);
});

export const updateProductModel = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const model = await productModelService.updateProductModel(shopId, req.params.id as string, req.body);
  sendSuccess(res, model, "Model updated successfully.");
});

export const deleteProductModel = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  await productModelService.deleteProductModel(shopId, req.params.id as string);
  sendSuccess(res, null, "Model deleted successfully.");
});
