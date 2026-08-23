import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requireOperationalAccess } from "../../common/middleware/operationalAccess.js";
import * as repairController from "./repair.controller.js";
import {
  addRepairItemSchema,
  createRepairSchema,
  listRepairsQuerySchema,
  repairIdParamSchema,
  updateRepairSchema,
  updateRepairStatusSchema,
} from "./repair.validation.js";

export const repairRouter = Router();

repairRouter.use(authenticate);

repairRouter.get(
  "/",
  requirePermission("REPAIR_VIEW", "REPAIR_MANAGE"),
  validate({ query: listRepairsQuerySchema }),
  repairController.listRepairs,
);
repairRouter.get(
  "/:id",
  requirePermission("REPAIR_VIEW", "REPAIR_MANAGE"),
  validate({ params: repairIdParamSchema }),
  repairController.getRepair,
);
repairRouter.post(
  "/",
  requirePermission("REPAIR_MANAGE"),
  requireOperationalAccess,
  validate({ body: createRepairSchema }),
  repairController.createRepair,
);
repairRouter.patch(
  "/:id/status",
  requirePermission("REPAIR_MANAGE"),
  requireOperationalAccess,
  validate({ params: repairIdParamSchema, body: updateRepairStatusSchema }),
  repairController.updateRepairStatus,
);
repairRouter.patch(
  "/:id",
  requirePermission("REPAIR_MANAGE"),
  requireOperationalAccess,
  validate({ params: repairIdParamSchema, body: updateRepairSchema }),
  repairController.updateRepair,
);
repairRouter.post(
  "/:id/items",
  requirePermission("REPAIR_MANAGE"),
  requireOperationalAccess,
  validate({ params: repairIdParamSchema, body: addRepairItemSchema }),
  repairController.addRepairItem,
);
