import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requireOperationalAccess } from "../../common/middleware/operationalAccess.js";
import * as purchaseReturnController from "./purchaseReturn.controller.js";
import { createPurchaseReturnSchema, listPurchaseReturnsQuerySchema } from "./purchaseReturn.validation.js";

export const purchaseReturnRouter = Router();

purchaseReturnRouter.use(authenticate);

purchaseReturnRouter.get(
  "/",
  requirePermission("PURCHASE_VIEW", "PURCHASE_RETURN"),
  validate({ query: listPurchaseReturnsQuerySchema }),
  purchaseReturnController.listPurchaseReturns,
);
purchaseReturnRouter.post(
  "/",
  requirePermission("PURCHASE_RETURN"),
  requireOperationalAccess,
  validate({ body: createPurchaseReturnSchema }),
  purchaseReturnController.createPurchaseReturn,
);
