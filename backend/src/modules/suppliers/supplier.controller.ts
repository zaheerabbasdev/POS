import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as supplierService from "./supplier.service.js";
import type { ListSuppliersInput } from "./supplier.service.js";

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await supplierService.listSuppliers(
    req.validatedQuery as unknown as ListSuppliersInput,
  );
  sendPaginated(res, data, pagination);
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.getSupplierById(req.params.id as string);
  sendSuccess(res, supplier);
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.body);
  sendSuccess(res, supplier, "Supplier created successfully.", HttpStatus.CREATED);
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.updateSupplier(req.params.id as string, req.body);
  sendSuccess(res, supplier, "Supplier updated successfully.");
});

export const getSupplierHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await supplierService.getSupplierHistory(req.params.id as string);
  sendSuccess(res, history);
});
