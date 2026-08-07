import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import * as saleService from "./sale.service.js";
import type { ListSalesInput } from "./sale.service.js";

export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await saleService.listSales(req.validatedQuery as unknown as ListSalesInput);
  sendPaginated(res, data, pagination);
});

export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const sale = await saleService.getSaleById(req.params.id as string);
  sendSuccess(res, sale);
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const sale = await saleService.createSale(req.body, req.user.id);
  sendSuccess(res, sale, "Sale created successfully.", HttpStatus.CREATED);
});

export const cancelSale = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { reason?: string } | undefined;
  const sale = await saleService.cancelSale(req.params.id as string, body?.reason, req.user.id);
  sendSuccess(res, sale, "Sale cancelled successfully.");
});
