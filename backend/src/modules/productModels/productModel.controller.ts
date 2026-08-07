import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as productModelService from "./productModel.service.js";
import type { ListProductModelsInput } from "./productModel.service.js";

export const listProductModels = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await productModelService.listProductModels(
    req.validatedQuery as unknown as ListProductModelsInput,
  );
  sendPaginated(res, data, pagination);
});

export const getProductModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await productModelService.getProductModelById(req.params.id as string);
  sendSuccess(res, model);
});

export const createProductModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await productModelService.createProductModel(req.body);
  sendSuccess(res, model, "Model created successfully.", HttpStatus.CREATED);
});

export const updateProductModel = asyncHandler(async (req: Request, res: Response) => {
  const model = await productModelService.updateProductModel(req.params.id as string, req.body);
  sendSuccess(res, model, "Model updated successfully.");
});

export const deleteProductModel = asyncHandler(async (req: Request, res: Response) => {
  await productModelService.deleteProductModel(req.params.id as string);
  sendSuccess(res, null, "Model deleted successfully.");
});
