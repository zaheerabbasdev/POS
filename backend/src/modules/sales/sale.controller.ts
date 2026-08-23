import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { logAuditFromRequest } from "../../common/utils/auditLog.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as saleService from "./sale.service.js";
import type { ListSalesInput } from "./sale.service.js";

export const listSales = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await saleService.listSales(shopId, req.validatedQuery as unknown as ListSalesInput);
  sendPaginated(res, data, pagination);
});

export const getSale = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const sale = await saleService.getSaleById(shopId, req.params.id as string);
  sendSuccess(res, sale);
});

export const createSale = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const sale = await saleService.createSale(shopId, req.body, req.user.id);
  sendSuccess(res, sale, "Sale created successfully.", HttpStatus.CREATED);
});

export const cancelSale = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const body = req.body as { reason?: string } | undefined;
  const sale = await saleService.cancelSale(shopId, req.params.id as string, body?.reason, req.user.id);
  void logAuditFromRequest(req, "Sale", "CANCEL", `Cancelled sale ${sale.invoiceNumber}${body?.reason ? ` — ${body.reason}` : ""}.`);
  sendSuccess(res, sale, "Sale cancelled successfully.");
});
