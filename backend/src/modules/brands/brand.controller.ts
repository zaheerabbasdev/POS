import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as brandService from "./brand.service.js";
import type { ListBrandsInput } from "./brand.service.js";

export const listBrands = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await brandService.listBrands(req.validatedQuery as unknown as ListBrandsInput);
  sendPaginated(res, data, pagination);
});

export const getBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.getBrandById(req.params.id as string);
  sendSuccess(res, brand);
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.createBrand(req.body);
  sendSuccess(res, brand, "Brand created successfully.", HttpStatus.CREATED);
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await brandService.updateBrand(req.params.id as string, req.body);
  sendSuccess(res, brand, "Brand updated successfully.");
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  await brandService.deleteBrand(req.params.id as string);
  sendSuccess(res, null, "Brand deleted successfully.");
});
