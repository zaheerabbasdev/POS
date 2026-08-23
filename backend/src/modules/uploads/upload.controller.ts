import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../../common/errors/AppError.js";
import { getShopId } from "../../common/middleware/tenant.js";
import * as uploadService from "./upload.service.js";
import type { UploadType } from "./upload.service.js";

// requirePermission (common/middleware/authorize.js) only checks a fixed
// permission list — it can't express "the permission depends on
// req.body.type," so the five upload types are mapped to their entity's own
// *_MANAGE permission here instead, checked once the body/id tells us which
// entity is actually being touched.
const PERMISSION_BY_TYPE: Record<UploadType, string> = {
  product: "PRODUCT_MANAGE",
  employee: "EMPLOYEE_MANAGE",
  customer: "CUSTOMER_MANAGE",
  repair: "REPAIR_MANAGE",
  logo: "SETTINGS_MANAGE",
};

export function requirePermissionForUploadType(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  const type = (req.body as { type?: UploadType }).type;
  const permission = type ? PERMISSION_BY_TYPE[type] : undefined;
  if (!permission || !req.user.permissions.includes(permission)) {
    next(new ForbiddenError());
    return;
  }
  next();
}

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError("An image file is required.");
  const shopId = getShopId(req);
  const body = req.body as { type: UploadType; entityId?: string };
  const result = await uploadService.uploadImage(shopId, body.type, req.file, body.entityId);
  sendSuccess(res, result, "Image uploaded successfully.", HttpStatus.CREATED);
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requirePermissionForDelete(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }
  const id = req.params.id as string;
  const type = (UUID_PATTERN.test(id) ? "product" : id.split(":")[0]) as UploadType;
  const permission = PERMISSION_BY_TYPE[type];
  if (!permission || !req.user.permissions.includes(permission)) {
    next(new ForbiddenError());
    return;
  }
  next();
}

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  const shopId = getShopId(req);
  await uploadService.deleteImage(shopId, req.params.id as string);
  sendSuccess(res, null, "Image deleted successfully.");
});
