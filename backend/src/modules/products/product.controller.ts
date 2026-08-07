import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { BadRequestError } from "../../common/errors/AppError.js";
import * as productService from "./product.service.js";
import type { ListProductsInput } from "./product.service.js";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await productService.listProducts(req.validatedQuery as unknown as ListProductsInput);
  sendPaginated(res, data, pagination);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id as string);
  sendSuccess(res, product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  sendSuccess(res, product, "Product created successfully.", HttpStatus.CREATED);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id as string, req.body);
  sendSuccess(res, product, "Product updated successfully.");
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string);
  sendSuccess(res, null, "Product deactivated successfully.");
});

export const uploadProductImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError("An image file is required.");
  const image = await productService.uploadProductImage(req.params.id as string, req.file);
  sendSuccess(res, image, "Image uploaded successfully.", HttpStatus.CREATED);
});
