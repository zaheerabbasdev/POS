import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requireOperationalAccess } from "../../common/middleware/operationalAccess.js";
import * as saleController from "./sale.controller.js";
import { cancelSaleSchema, createSaleSchema, listSalesQuerySchema, saleIdParamSchema } from "./sale.validation.js";

export const saleRouter = Router();

saleRouter.use(authenticate);

saleRouter.get(
  "/",
  requirePermission("SALE_VIEW", "SALE_CREATE"),
  validate({ query: listSalesQuerySchema }),
  saleController.listSales,
);
saleRouter.get(
  "/:id",
  requirePermission("SALE_VIEW", "SALE_CREATE"),
  validate({ params: saleIdParamSchema }),
  saleController.getSale,
);
saleRouter.post(
  "/",
  requirePermission("SALE_CREATE"),
  requireOperationalAccess,
  validate({ body: createSaleSchema }),
  saleController.createSale,
);
saleRouter.patch(
  "/:id/cancel",
  requirePermission("SALE_CANCEL"),
  requireOperationalAccess,
  validate({ params: saleIdParamSchema, body: cancelSaleSchema }),
  saleController.cancelSale,
);
