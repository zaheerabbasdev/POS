import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as productModelController from "./productModel.controller.js";
import {
  createProductModelSchema,
  listProductModelsQuerySchema,
  productModelIdParamSchema,
  updateProductModelSchema,
} from "./productModel.validation.js";

export const productModelRouter = Router();

productModelRouter.use(authenticate);

productModelRouter.get(
  "/",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ query: listProductModelsQuerySchema }),
  productModelController.listProductModels,
);
productModelRouter.get(
  "/:id",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ params: productModelIdParamSchema }),
  productModelController.getProductModel,
);
productModelRouter.post(
  "/",
  requirePermission("PRODUCT_MANAGE"),
  validate({ body: createProductModelSchema }),
  productModelController.createProductModel,
);
productModelRouter.patch(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: productModelIdParamSchema, body: updateProductModelSchema }),
  productModelController.updateProductModel,
);
productModelRouter.delete(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: productModelIdParamSchema }),
  productModelController.deleteProductModel,
);
