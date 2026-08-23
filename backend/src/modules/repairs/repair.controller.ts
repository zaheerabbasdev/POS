import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as repairService from "./repair.service.js";
import type { ListRepairsInput, RepairStatusValue } from "./repair.service.js";

export const listRepairs = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const { data, pagination } = await repairService.listRepairs(shopId, req.validatedQuery as unknown as ListRepairsInput);
  sendPaginated(res, data, pagination);
});

export const getRepair = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const repair = await repairService.getRepairById(shopId, req.params.id as string);
  sendSuccess(res, repair);
});

export const createRepair = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const repair = await repairService.createRepair(shopId, req.body);
  sendSuccess(res, repair, "Repair ticket created successfully.", HttpStatus.CREATED);
});

export const updateRepairStatus = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const body = req.body as { status: RepairStatusValue };
  const repair = await repairService.updateRepairStatus(shopId, req.params.id as string, body.status);
  sendSuccess(res, repair, "Repair status updated.");
});

export const updateRepair = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const repair = await repairService.updateRepair(shopId, req.params.id as string, req.body);
  sendSuccess(res, repair, "Repair updated successfully.");
});

export const addRepairItem = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  const repair = await repairService.addRepairItem(shopId, req.params.id as string, req.body);
  sendSuccess(res, repair, "Part recorded and stock updated.", HttpStatus.CREATED);
});
