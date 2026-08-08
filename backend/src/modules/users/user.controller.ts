import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated, sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { UnauthorizedError } from "../../common/errors/AppError.js";
import { logAuditFromRequest } from "../../common/utils/auditLog.js";
import * as userService from "./user.service.js";
import type { ListUsersInput } from "./user.service.js";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await userService.listUsers(req.validatedQuery as unknown as ListUsersInput);
  sendPaginated(res, data, pagination);
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id as string);
  sendSuccess(res, user);
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  void logAuditFromRequest(req, "User", "CREATE", `Created user "${user.username}".`);
  sendSuccess(res, user, "User created successfully.", HttpStatus.CREATED);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateUser(req.params.id as string, req.body);
  void logAuditFromRequest(req, "User", "UPDATE", `Updated user "${user.username}".`);
  sendSuccess(res, user, "User updated successfully.");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new UnauthorizedError();
  await userService.deleteUser(req.params.id as string, req.user.id);
  void logAuditFromRequest(req, "User", "DEACTIVATE", `Deactivated user ${req.params.id as string}.`);
  sendSuccess(res, null, "User deactivated successfully.");
});
