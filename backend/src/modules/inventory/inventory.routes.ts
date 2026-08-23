import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requireOperationalAccess } from "../../common/middleware/operationalAccess.js";
import * as inventoryController from "./inventory.controller.js";
import {
  createAdjustmentSchema,
  listInventoryQuerySchema,
  productIdParamSchema,
} from "./inventory.validation.js";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

inventoryRouter.get(
  "/",
  requirePermission("INVENTORY_VIEW", "INVENTORY_MANAGE"),
  validate({ query: listInventoryQuerySchema }),
  inventoryController.listInventory,
);
inventoryRouter.post(
  "/adjustment",
  requirePermission("INVENTORY_MANAGE"),
  requireOperationalAccess,
  validate({ body: createAdjustmentSchema }),
  inventoryController.createAdjustment,
);
inventoryRouter.get(
  "/:productId/history",
  requirePermission("INVENTORY_VIEW", "INVENTORY_MANAGE"),
  validate({ params: productIdParamSchema }),
  inventoryController.getStockHistory,
);
