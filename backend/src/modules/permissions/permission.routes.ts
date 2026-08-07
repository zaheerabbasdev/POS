import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as permissionController from "./permission.controller.js";

export const permissionRouter = Router();

permissionRouter.use(authenticate);

permissionRouter.get("/", requirePermission("ROLE_MANAGE"), permissionController.listPermissions);
