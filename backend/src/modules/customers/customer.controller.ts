import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as customerService from "./customer.service.js";
import type { ListCustomersInput } from "./customer.service.js";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await customerService.listCustomers(
    req.validatedQuery as unknown as ListCustomersInput,
  );
  sendPaginated(res, data, pagination);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.id as string);
  sendSuccess(res, customer);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body);
  sendSuccess(res, customer, "Customer created successfully.", HttpStatus.CREATED);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(req.params.id as string, req.body);
  sendSuccess(res, customer, "Customer updated successfully.");
});

export const getCustomerHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await customerService.getCustomerHistory(req.params.id as string);
  sendSuccess(res, history);
});
