import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as supplierService from "./supplier.service.js";
import type { ListSuppliersInput } from "./supplier.service.js";

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await supplierService.listSuppliers(
    shopId,
    req.validatedQuery as unknown as ListSuppliersInput,
  );
  sendPaginated(res, data, pagination);
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const supplier = await supplierService.getSupplierById(shopId, req.params.id as string);
  sendSuccess(res, supplier);
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const supplier = await supplierService.createSupplier(shopId, req.body);
  sendSuccess(res, supplier, "Supplier created successfully.", HttpStatus.CREATED);
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const supplier = await supplierService.updateSupplier(shopId, req.params.id as string, req.body);
  sendSuccess(res, supplier, "Supplier updated successfully.");
});

export const getSupplierHistory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const history = await supplierService.getSupplierHistory(shopId, req.params.id as string);
  sendSuccess(res, history);
});
