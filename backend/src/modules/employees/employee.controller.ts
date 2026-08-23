import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as employeeService from "./employee.service.js";
import type { ListEmployeesInput } from "./employee.service.js";

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await employeeService.listEmployees(
    shopId,
    req.validatedQuery as unknown as ListEmployeesInput,
  );
  sendPaginated(res, data, pagination);
});

export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const employee = await employeeService.getEmployeeById(shopId, req.params.id as string);
  sendSuccess(res, employee);
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const employee = await employeeService.createEmployee(shopId, req.body);
  sendSuccess(res, employee, "Employee created successfully.", HttpStatus.CREATED);
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const employee = await employeeService.updateEmployee(shopId, req.params.id as string, req.body);
  sendSuccess(res, employee, "Employee updated successfully.");
});

export const deactivateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  await employeeService.deactivateEmployee(shopId, req.params.id as string);
  sendSuccess(res, null, "Employee deactivated successfully.");
});
