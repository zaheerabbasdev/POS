import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as categoryService from "./category.service.js";
import type { ListCategoriesInput } from "./category.service.js";

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await categoryService.listCategories(
    shopId,
    req.validatedQuery as unknown as ListCategoriesInput,
  );
  sendPaginated(res, data, pagination);
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const category = await categoryService.getCategoryById(shopId, req.params.id as string);
  sendSuccess(res, category);
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const category = await categoryService.createCategory(shopId, req.body);
  sendSuccess(res, category, "Category created successfully.", HttpStatus.CREATED);
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const category = await categoryService.updateCategory(shopId, req.params.id as string, req.body);
  sendSuccess(res, category, "Category updated successfully.");
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  await categoryService.deleteCategory(shopId, req.params.id as string);
  sendSuccess(res, null, "Category deleted successfully.");
});
