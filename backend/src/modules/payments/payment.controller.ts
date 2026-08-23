import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as paymentService from "./payment.service.js";
import type { ListPaymentsInput } from "./payment.service.js";

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await paymentService.listPayments(
    shopId,
    req.validatedQuery as unknown as ListPaymentsInput,
  );
  sendPaginated(res, data, pagination);
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  if (!req.user) throw new UnauthorizedError();
  const payment = await paymentService.createPayment(shopId, req.body, req.user.id);
  sendSuccess(res, payment, "Payment recorded successfully.", HttpStatus.CREATED);
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const history = await paymentService.getPaymentHistory(shopId, req.params.id as string);
  sendSuccess(res, history);
});
