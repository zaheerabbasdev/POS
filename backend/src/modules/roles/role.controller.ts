import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import { logAuditFromRequest } from "../../common/utils/auditLog.js";
import * as roleService from "./role.service.js";

export const listRoles = asyncHandler(async (_req: Request, res: Response) => {
  const roles = await roleService.listRoles();
  sendSuccess(res, roles);
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.getRoleById(req.params.id as string);
  sendSuccess(res, role);
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.createRole(req.body);
  void logAuditFromRequest(req, "Role", "CREATE", `Created role "${role.name}".`);
  sendSuccess(res, role, "Role created successfully.", HttpStatus.CREATED);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await roleService.updateRole(req.params.id as string, req.body);
  void logAuditFromRequest(req, "Role", "UPDATE", `Updated role "${role.name}".`);
  sendSuccess(res, role, "Role updated successfully.");
});

export const assignPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { permissions } = req.body as { permissions: string[] };
  const role = await roleService.assignPermissions(req.params.id as string, permissions);
  void logAuditFromRequest(req, "Role", "ASSIGN_PERMISSIONS", `Set permissions for role "${role.name}": ${permissions.join(", ")}.`);
  sendSuccess(res, role, "Permissions updated successfully.");
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  await roleService.deleteRole(req.params.id as string);
  void logAuditFromRequest(req, "Role", "DELETE", `Deleted role ${req.params.id as string}.`);
  sendSuccess(res, null, "Role deleted successfully.");
});
