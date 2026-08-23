import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as customerService from "./customer.service.js";
import type { ListCustomersInput } from "./customer.service.js";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await customerService.listCustomers(
    shopId,
    req.validatedQuery as unknown as ListCustomersInput,
  );
  sendPaginated(res, data, pagination);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const customer = await customerService.getCustomerById(shopId, req.params.id as string);
  sendSuccess(res, customer);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const customer = await customerService.createCustomer(shopId, req.body);
  sendSuccess(res, customer, "Customer created successfully.", HttpStatus.CREATED);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const customer = await customerService.updateCustomer(shopId, req.params.id as string, req.body);
  sendSuccess(res, customer, "Customer updated successfully.");
});

export const getCustomerHistory = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const history = await customerService.getCustomerHistory(shopId, req.params.id as string);
  sendSuccess(res, history);
});
