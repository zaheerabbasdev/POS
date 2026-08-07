import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as supplierController from "./supplier.controller.js";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from "./supplier.validation.js";

export const supplierRouter = Router();

supplierRouter.use(authenticate);

supplierRouter.get(
  "/",
  requirePermission("SUPPLIER_VIEW", "SUPPLIER_MANAGE"),
  validate({ query: listSuppliersQuerySchema }),
  supplierController.listSuppliers,
);
supplierRouter.get(
  "/:id",
  requirePermission("SUPPLIER_VIEW", "SUPPLIER_MANAGE"),
  validate({ params: supplierIdParamSchema }),
  supplierController.getSupplier,
);
supplierRouter.get(
  "/:id/history",
  requirePermission("SUPPLIER_VIEW", "SUPPLIER_MANAGE"),
  validate({ params: supplierIdParamSchema }),
  supplierController.getSupplierHistory,
);
supplierRouter.post(
  "/",
  requirePermission("SUPPLIER_MANAGE"),
  validate({ body: createSupplierSchema }),
  supplierController.createSupplier,
);
supplierRouter.patch(
  "/:id",
  requirePermission("SUPPLIER_MANAGE"),
  validate({ params: supplierIdParamSchema, body: updateSupplierSchema }),
  supplierController.updateSupplier,
);
