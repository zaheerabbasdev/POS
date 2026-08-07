import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as roleController from "./role.controller.js";
import {
  assignPermissionsSchema,
  createRoleSchema,
  roleIdParamSchema,
  updateRoleSchema,
} from "./role.validation.js";

export const roleRouter = Router();

roleRouter.use(authenticate);

// Role/permission administration is deliberately gated behind a single,
// coarser permission (RBAC configuration is inherently sensitive) rather
// than split into view/manage like the Users module.
roleRouter.get("/", requirePermission("ROLE_MANAGE"), roleController.listRoles);
roleRouter.get("/:id", requirePermission("ROLE_MANAGE"), validate({ params: roleIdParamSchema }), roleController.getRole);
roleRouter.post("/", requirePermission("ROLE_MANAGE"), validate({ body: createRoleSchema }), roleController.createRole);
roleRouter.patch(
  "/:id",
  requirePermission("ROLE_MANAGE"),
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  roleController.updateRole,
);
roleRouter.post(
  "/:id/permissions",
  requirePermission("ROLE_MANAGE"),
  validate({ params: roleIdParamSchema, body: assignPermissionsSchema }),
  roleController.assignPermissions,
);
roleRouter.delete(
  "/:id",
  requirePermission("ROLE_MANAGE"),
  validate({ params: roleIdParamSchema }),
  roleController.deleteRole,
);
