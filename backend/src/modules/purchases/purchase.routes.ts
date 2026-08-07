import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as purchaseController from "./purchase.controller.js";
import {
  createPurchaseSchema,
  listPurchasesQuerySchema,
  purchaseIdParamSchema,
  updatePurchaseSchema,
} from "./purchase.validation.js";

export const purchaseRouter = Router();

purchaseRouter.use(authenticate);

purchaseRouter.get(
  "/",
  requirePermission("PURCHASE_VIEW", "PURCHASE_CREATE"),
  validate({ query: listPurchasesQuerySchema }),
  purchaseController.listPurchases,
);
purchaseRouter.get(
  "/:id",
  requirePermission("PURCHASE_VIEW", "PURCHASE_CREATE"),
  validate({ params: purchaseIdParamSchema }),
  purchaseController.getPurchase,
);
purchaseRouter.post(
  "/",
  requirePermission("PURCHASE_CREATE"),
  validate({ body: createPurchaseSchema }),
  purchaseController.createPurchase,
);
purchaseRouter.patch(
  "/:id",
  requirePermission("PURCHASE_CREATE"),
  validate({ params: purchaseIdParamSchema, body: updatePurchaseSchema }),
  purchaseController.updatePurchase,
);
purchaseRouter.delete(
  "/:id",
  requirePermission("PURCHASE_CREATE"),
  validate({ params: purchaseIdParamSchema }),
  purchaseController.deletePurchase,
);
